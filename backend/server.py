from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import os
import json
import uuid
from enum import Enum
import asyncio
import openai
import anthropic
from dotenv import load_dotenv

# Google Workspace imports
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from google.auth.transport.requests import Request as GoogleRequest
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

load_dotenv()

# Initialize FastAPI
app = FastAPI(
    title="VERSATIL - AI Assistant Platform",
    description="Multitenant SaaS platform for AI assistants and agents",
    version="1.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for preview mode
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Database Configuration
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017/versatil_db")
client = AsyncIOMotorClient(MONGO_URL)
db = client.versatil_db

# JWT Configuration
JWT_SECRET = os.getenv("JWT_SECRET_KEY", "your-super-secret-jwt-key")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# AI Clients
openai.api_key = os.getenv("OPENAI_API_KEY")
anthropic_client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

# Google Workspace Configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8001/api/google/callback")

# Google Workspace scopes
GOOGLE_SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/drive.file'
]

# Enums
class UserRole(str, Enum):
    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"
    GUEST = "guest"

class AssistantType(str, Enum):
    CHAT = "chat"
    WORKFLOW = "workflow"
    SEARCH = "search"
    ANALYSIS = "analysis"

class ConversationStatus(str, Enum):
    ACTIVE = "active"
    ARCHIVED = "archived"
    DELETED = "deleted"

class GoogleIntegrationStatus(str, Enum):
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    ERROR = "error"
    DELETED = "deleted"

# Pydantic Models
class User(BaseModel):
    id: str
    email: EmailStr
    name: str
    avatar_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    workspaces: List[str] = []

class Workspace(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    owner_id: str
    members: List[Dict[str, Any]] = []
    settings: Dict[str, Any] = {}
    created_at: datetime
    updated_at: datetime
    plan: str = "free"

class Assistant(BaseModel):
    id: str
    workspace_id: str
    name: str
    description: Optional[str] = None
    avatar_url: Optional[str] = None
    type: AssistantType
    model: str = "gpt-4"
    system_prompt: str
    instructions: str
    tools: List[Dict[str, Any]] = []
    data_sources: List[str] = []
    settings: Dict[str, Any] = {}
    created_by: str
    created_at: datetime
    updated_at: datetime
    is_public: bool = False
    usage_count: int = 0

class Conversation(BaseModel):
    id: str
    workspace_id: str
    assistant_id: str
    user_id: str
    title: str
    status: ConversationStatus
    messages: List[Dict[str, Any]] = []
    metadata: Dict[str, Any] = {}
    created_at: datetime
    updated_at: datetime

class Message(BaseModel):
    id: str
    conversation_id: str
    role: str  # user, assistant, system
    content: str
    metadata: Dict[str, Any] = {}
    created_at: datetime

class GoogleIntegration(BaseModel):
    id: str
    workspace_id: str
    user_id: str
    service: str  # gmail, drive, docs, sheets, calendar
    status: GoogleIntegrationStatus
    credentials: Dict[str, Any] = {}  # Encrypted credentials
    settings: Dict[str, Any] = {}
    last_sync: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

class GoogleDocument(BaseModel):
    id: str
    workspace_id: str
    integration_id: str
    google_id: str
    title: str
    content: str
    doc_type: str  # document, spreadsheet, presentation
    url: str
    last_modified: datetime
    created_at: datetime

# Auth Models
class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    workspace_name: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: User
    workspace: Workspace

# Utility Functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        
        return User(**user)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Database Initialization
async def init_db():
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.workspaces.create_index("id", unique=True)
    await db.workspaces.create_index("slug", unique=True)
    await db.assistants.create_index("id", unique=True)
    await db.assistants.create_index("workspace_id")
    await db.conversations.create_index("id", unique=True)
    await db.conversations.create_index("workspace_id")
    await db.conversations.create_index("user_id")
    await db.messages.create_index("conversation_id")
    # Google Workspace indexes
    await db.google_integrations.create_index("id", unique=True)
    await db.google_integrations.create_index("workspace_id")
    await db.google_integrations.create_index("user_id")
    await db.google_documents.create_index("id", unique=True)
    await db.google_documents.create_index("workspace_id")
    await db.google_documents.create_index("google_id")
    await db.google_documents.create_index("integration_id")
    print("Database initialized successfully!")

# API Routes
@app.get("/")
async def root():
    return {"message": "VERSATIL AI Platform API", "version": "1.0.0"}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

# Authentication Routes
@app.post("/api/auth/register", response_model=TokenResponse)
async def register(user_data: UserRegister):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_id = str(uuid.uuid4())
    workspace_id = str(uuid.uuid4())
    workspace_slug = user_data.workspace_name.lower().replace(" ", "-") if user_data.workspace_name else f"workspace-{user_id[:8]}"
    
    # Create workspace first
    workspace = Workspace(
        id=workspace_id,
        name=user_data.workspace_name or f"{user_data.name}'s Workspace",
        slug=workspace_slug,
        owner_id=user_id,
        members=[{
            "user_id": user_id,
            "role": UserRole.OWNER,
            "joined_at": datetime.utcnow()
        }],
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    await db.workspaces.insert_one(workspace.dict())
    
    # Create user
    user = User(
        id=user_id,
        email=user_data.email,
        name=user_data.name,
        workspaces=[workspace_id],
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    # Hash password and store
    user_doc = user.dict()
    user_doc["password"] = hash_password(user_data.password)
    
    await db.users.insert_one(user_doc)
    
    # Create access token
    access_token = create_access_token({"sub": user_id})
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user,
        workspace=workspace
    )

@app.get("/api/auth/verify")
async def verify_token(current_user: User = Depends(get_current_user)):
    return {"message": "Token is valid", "user": current_user}

@app.post("/api/auth/login", response_model=TokenResponse)
async def login(user_data: UserLogin):
    user_doc = await db.users.find_one({"email": user_data.email})
    if not user_doc or not verify_password(user_data.password, user_doc["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user = User(**{k: v for k, v in user_doc.items() if k != "password"})
    
    # Get user's primary workspace
    workspace_doc = await db.workspaces.find_one({"id": user.workspaces[0] if user.workspaces else None})
    if not workspace_doc:
        raise HTTPException(status_code=404, detail="No workspace found")
    
    workspace = Workspace(**workspace_doc)
    
    access_token = create_access_token({"sub": user.id})
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user,
        workspace=workspace
    )

# Workspace Routes
@app.get("/api/workspaces", response_model=List[Workspace])
async def get_user_workspaces(current_user: User = Depends(get_current_user)):
    workspaces = []
    for workspace_id in current_user.workspaces:
        workspace_doc = await db.workspaces.find_one({"id": workspace_id})
        if workspace_doc:
            workspaces.append(Workspace(**workspace_doc))
    return workspaces

@app.get("/api/workspaces/{workspace_id}", response_model=Workspace)
async def get_workspace(workspace_id: str, current_user: User = Depends(get_current_user)):
    if workspace_id not in current_user.workspaces:
        raise HTTPException(status_code=403, detail="Access denied")
    
    workspace_doc = await db.workspaces.find_one({"id": workspace_id})
    if not workspace_doc:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    return Workspace(**workspace_doc)

# Assistant Routes
@app.get("/api/workspaces/{workspace_id}/assistants", response_model=List[Assistant])
async def get_assistants(workspace_id: str, current_user: User = Depends(get_current_user)):
    if workspace_id not in current_user.workspaces:
        raise HTTPException(status_code=403, detail="Access denied")
    
    assistants_cursor = db.assistants.find({"workspace_id": workspace_id})
    assistants = []
    async for assistant_doc in assistants_cursor:
        assistants.append(Assistant(**assistant_doc))
    
    return assistants

@app.post("/api/workspaces/{workspace_id}/assistants", response_model=Assistant)
async def create_assistant(
    workspace_id: str,
    assistant_data: dict,
    current_user: User = Depends(get_current_user)
):
    if workspace_id not in current_user.workspaces:
        raise HTTPException(status_code=403, detail="Access denied")
    
    assistant = Assistant(
        id=str(uuid.uuid4()),
        workspace_id=workspace_id,
        name=assistant_data["name"],
        description=assistant_data.get("description"),
        type=AssistantType(assistant_data.get("type", "chat")),
        model=assistant_data.get("model", "gpt-4"),
        system_prompt=assistant_data.get("system_prompt", "You are a helpful AI assistant."),
        instructions=assistant_data.get("instructions", ""),
        created_by=current_user.id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    await db.assistants.insert_one(assistant.dict())
    return assistant

@app.get("/api/workspaces/{workspace_id}/assistants/{assistant_id}", response_model=Assistant)
async def get_assistant(
    workspace_id: str,
    assistant_id: str,
    current_user: User = Depends(get_current_user)
):
    if workspace_id not in current_user.workspaces:
        raise HTTPException(status_code=403, detail="Access denied")
    
    assistant_doc = await db.assistants.find_one({
        "id": assistant_id,
        "workspace_id": workspace_id
    })
    
    if not assistant_doc:
        raise HTTPException(status_code=404, detail="Assistant not found")
    
    return Assistant(**assistant_doc)

@app.put("/api/workspaces/{workspace_id}/assistants/{assistant_id}", response_model=Assistant)
async def update_assistant(
    workspace_id: str,
    assistant_id: str,
    assistant_data: dict,
    current_user: User = Depends(get_current_user)
):
    if workspace_id not in current_user.workspaces:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check if assistant exists
    existing_assistant = await db.assistants.find_one({
        "id": assistant_id,
        "workspace_id": workspace_id
    })
    
    if not existing_assistant:
        raise HTTPException(status_code=404, detail="Assistant not found")
    
    # Update fields
    update_data = {
        "name": assistant_data.get("name", existing_assistant["name"]),
        "description": assistant_data.get("description", existing_assistant.get("description")),
        "type": assistant_data.get("type", existing_assistant["type"]),
        "model": assistant_data.get("model", existing_assistant["model"]),
        "system_prompt": assistant_data.get("system_prompt", existing_assistant["system_prompt"]),
        "instructions": assistant_data.get("instructions", existing_assistant.get("instructions", "")),
        "updated_at": datetime.utcnow()
    }
    
    # Update in database
    await db.assistants.update_one(
        {"id": assistant_id, "workspace_id": workspace_id},
        {"$set": update_data}
    )
    
    # Return updated assistant
    updated_assistant_doc = await db.assistants.find_one({
        "id": assistant_id,
        "workspace_id": workspace_id
    })
    
    return Assistant(**updated_assistant_doc)

@app.delete("/api/workspaces/{workspace_id}/assistants/{assistant_id}")
async def delete_assistant(
    workspace_id: str,
    assistant_id: str,
    current_user: User = Depends(get_current_user)
):
    if workspace_id not in current_user.workspaces:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check if assistant exists
    assistant_doc = await db.assistants.find_one({
        "id": assistant_id,
        "workspace_id": workspace_id
    })
    
    if not assistant_doc:
        raise HTTPException(status_code=404, detail="Assistant not found")
    
    # Delete the assistant
    await db.assistants.delete_one({
        "id": assistant_id,
        "workspace_id": workspace_id
    })
    
    # Also delete all conversations with this assistant
    await db.conversations.delete_many({
        "assistant_id": assistant_id,
        "workspace_id": workspace_id
    })
    
    # Delete all messages from those conversations
    await db.messages.delete_many({
        "conversation_id": {"$in": []}  # This would need to be updated to get conversation IDs first
    })
    
    return {"message": "Assistant deleted successfully"}

# Conversation Routes
@app.get("/api/workspaces/{workspace_id}/conversations", response_model=List[Conversation])
async def get_conversations(workspace_id: str, current_user: User = Depends(get_current_user)):
    if workspace_id not in current_user.workspaces:
        raise HTTPException(status_code=403, detail="Access denied")
    
    conversations_cursor = db.conversations.find({
        "workspace_id": workspace_id,
        "user_id": current_user.id,
        "status": {"$ne": ConversationStatus.DELETED}
    }).sort("updated_at", -1)
    
    conversations = []
    async for conv_doc in conversations_cursor:
        conversations.append(Conversation(**conv_doc))
    
    return conversations

@app.post("/api/workspaces/{workspace_id}/conversations", response_model=Conversation)
async def create_conversation(
    workspace_id: str,
    conversation_data: dict,
    current_user: User = Depends(get_current_user)
):
    if workspace_id not in current_user.workspaces:
        raise HTTPException(status_code=403, detail="Access denied")
    
    conversation = Conversation(
        id=str(uuid.uuid4()),
        workspace_id=workspace_id,
        assistant_id=conversation_data["assistant_id"],
        user_id=current_user.id,
        title=conversation_data.get("title", "New Conversation"),
        status=ConversationStatus.ACTIVE,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    await db.conversations.insert_one(conversation.dict())
    return conversation

# Chat Routes
@app.post("/api/conversations/{conversation_id}/messages")
async def send_message(
    conversation_id: str,
    message_data: dict,
    current_user: User = Depends(get_current_user)
):
    # Verify conversation access
    conversation_doc = await db.conversations.find_one({
        "id": conversation_id,
        "user_id": current_user.id
    })
    if not conversation_doc:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    conversation = Conversation(**conversation_doc)
    
    # Get assistant
    assistant_doc = await db.assistants.find_one({"id": conversation.assistant_id})
    if not assistant_doc:
        raise HTTPException(status_code=404, detail="Assistant not found")
    
    assistant = Assistant(**assistant_doc)
    
    # Create user message
    user_message = Message(
        id=str(uuid.uuid4()),
        conversation_id=conversation_id,
        role="user",
        content=message_data["content"],
        created_at=datetime.utcnow()
    )
    
    await db.messages.insert_one(user_message.dict())
    
    # Generate AI response
    try:
        if assistant.model.startswith("gpt"):
            # Use new OpenAI client
            openai_api_key = os.getenv("OPENAI_API_KEY")
            if openai_api_key and openai_api_key != "your-openai-api-key":
                client = openai.OpenAI(api_key=openai_api_key)
                response = client.chat.completions.create(
                    model=assistant.model,
                    messages=[
                        {"role": "system", "content": assistant.system_prompt},
                        {"role": "user", "content": message_data["content"]}
                    ],
                    max_tokens=1000
                )
                ai_content = response.choices[0].message.content
            else:
                ai_content = f"I'm a {assistant.name} assistant. You asked: '{message_data['content']}'. (This is a demo response - configure OpenAI API key for real AI responses)"
        else:
            # Use Anthropic (if API key is available)
            anthropic_api_key = os.getenv("ANTHROPIC_API_KEY")
            if anthropic_api_key and anthropic_api_key != "your-anthropic-api-key":
                response = anthropic_client.messages.create(
                    model="claude-3-sonnet-20240229",
                    max_tokens=1000,
                    messages=[{"role": "user", "content": message_data["content"]}],
                    system=assistant.system_prompt
                )
                ai_content = response.content[0].text
            else:
                # Fallback response
                ai_content = f"I'm a {assistant.name} assistant. You asked: '{message_data['content']}'. (This is a demo response - configure Anthropic API key for real AI responses)"
        
        # Create assistant message
        assistant_message = Message(
            id=str(uuid.uuid4()),
            conversation_id=conversation_id,
            role="assistant",
            content=ai_content,
            created_at=datetime.utcnow()
        )
        
        await db.messages.insert_one(assistant_message.dict())
        
        # Update conversation
        await db.conversations.update_one(
            {"id": conversation_id},
            {"$set": {"updated_at": datetime.utcnow()}}
        )
        
        return {"user_message": user_message, "assistant_message": assistant_message}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI response error: {str(e)}")

@app.get("/api/conversations/{conversation_id}/messages", response_model=List[Message])
async def get_messages(
    conversation_id: str,
    current_user: User = Depends(get_current_user)
):
    # Verify conversation access
    conversation_doc = await db.conversations.find_one({
        "id": conversation_id,
        "user_id": current_user.id
    })
    if not conversation_doc:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    messages_cursor = db.messages.find({"conversation_id": conversation_id}).sort("created_at", 1)
    messages = []
    async for message_doc in messages_cursor:
        messages.append(Message(**message_doc))
    
    return messages

# Google Workspace Integration Routes

# Google Workspace Integration Routes

@app.get("/api/auth/google")
async def google_login():
    """Initiate Google OAuth for authentication"""
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET or GOOGLE_CLIENT_ID == "your-google-client-id":
        # Return demo authentication flow for preview mode
        return {
            "demo_mode": True,
            "auth_url": f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/auth/google/demo",
            "message": "Demo mode: This will simulate Google login for preview purposes"
        }
    
    # Create OAuth flow for authentication (different scopes than workspace integration)
    auth_scopes = [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'openid'
    ]
    
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [GOOGLE_REDIRECT_URI.replace('/google/callback', '/auth/google/callback')]
            }
        },
        scopes=auth_scopes
    )
    flow.redirect_uri = GOOGLE_REDIRECT_URI.replace('/google/callback', '/auth/google/callback')
    
    # Generate authorization URL
    auth_url, state = flow.authorization_url(
        prompt='select_account',
        state=f"auth:{uuid.uuid4()}"
    )
    
    return {"auth_url": auth_url, "state": state}

@app.post("/api/auth/google/demo")
async def google_demo_login():
    """Demo Google login for preview mode"""
    # Create demo user data
    demo_email = "demo.user@gmail.com"
    demo_name = "Demo User"
    demo_picture = "https://lh3.googleusercontent.com/a/default-user=s96-c"
    
    # Check if demo user exists
    existing_user = await db.users.find_one({"email": demo_email})
    
    if existing_user:
        # Login existing demo user
        user = User(**{k: v for k, v in existing_user.items() if k != "password"})
        
        # Get user's primary workspace
        workspace_doc = await db.workspaces.find_one({"id": user.workspaces[0] if user.workspaces else None})
        if not workspace_doc:
            raise HTTPException(status_code=404, detail="No workspace found")
        
        workspace = Workspace(**workspace_doc)
    else:
        # Create new demo user
        user_id = str(uuid.uuid4())
        workspace_id = str(uuid.uuid4())
        workspace_slug = f"demo-workspace-{user_id[:8]}"
        
        # Create workspace
        workspace = Workspace(
            id=workspace_id,
            name="Demo User's Workspace",
            slug=workspace_slug,
            owner_id=user_id,
            members=[{
                "user_id": user_id,
                "role": UserRole.OWNER,
                "joined_at": datetime.utcnow()
            }],
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        await db.workspaces.insert_one(workspace.dict())
        
        # Create demo user
        user = User(
            id=user_id,
            email=demo_email,
            name=demo_name,
            avatar_url=demo_picture,
            workspaces=[workspace_id],
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        # Store user
        user_doc = user.dict()
        user_doc["google_id"] = "demo_google_123"
        user_doc["auth_provider"] = "google_demo"
        
        await db.users.insert_one(user_doc)
    
    # Create access token
    access_token = create_access_token({"sub": user.id})
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user,
        workspace=workspace
    )

@app.get("/api/auth/google/callback")
async def google_login_callback(request: Request, code: str = None, state: str = None, error: str = None):
    """Handle Google OAuth callback for authentication"""
    if error:
        raise HTTPException(status_code=400, detail=f"OAuth error: {error}")
    
    if not code or not state:
        raise HTTPException(status_code=400, detail="Missing authorization code or state")
    
    try:
        # Create OAuth flow
        auth_scopes = [
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
            'openid'
        ]
        
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [GOOGLE_REDIRECT_URI.replace('/google/callback', '/auth/google/callback')]
                }
            },
            scopes=auth_scopes
        )
        flow.redirect_uri = GOOGLE_REDIRECT_URI.replace('/google/callback', '/auth/google/callback')
        
        # Exchange code for credentials
        flow.fetch_token(code=code)
        credentials = flow.credentials
        
        # Get user info from Google
        user_info_service = build('oauth2', 'v2', credentials=credentials)
        google_user_info = user_info_service.userinfo().get().execute()
        
        email = google_user_info.get('email')
        name = google_user_info.get('name')
        google_id = google_user_info.get('id')
        picture = google_user_info.get('picture')
        
        if not email:
            raise HTTPException(status_code=400, detail="Email not provided by Google")
        
        # Check if user exists
        existing_user = await db.users.find_one({"email": email})
        
        if existing_user:
            # Login existing user
            user = User(**{k: v for k, v in existing_user.items() if k != "password"})
            
            # Get user's primary workspace
            workspace_doc = await db.workspaces.find_one({"id": user.workspaces[0] if user.workspaces else None})
            if not workspace_doc:
                raise HTTPException(status_code=404, detail="No workspace found")
            
            workspace = Workspace(**workspace_doc)
            
            # Create access token
            access_token = create_access_token({"sub": user.id})
            
            # Return success response for frontend
            return {
                "success": True,
                "access_token": access_token,
                "user": user,
                "workspace": workspace,
                "redirect_url": f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/dashboard?google_auth=success"
            }
        else:
            # Register new user
            user_id = str(uuid.uuid4())
            workspace_id = str(uuid.uuid4())
            workspace_slug = f"workspace-{user_id[:8]}"
            
            # Create workspace first
            workspace = Workspace(
                id=workspace_id,
                name=f"{name}'s Workspace",
                slug=workspace_slug,
                owner_id=user_id,
                members=[{
                    "user_id": user_id,
                    "role": UserRole.OWNER,
                    "joined_at": datetime.utcnow()
                }],
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
            await db.workspaces.insert_one(workspace.dict())
            
            # Create user
            user = User(
                id=user_id,
                email=email,
                name=name,
                avatar_url=picture,
                workspaces=[workspace_id],
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
            # Store user (no password needed for Google auth)
            user_doc = user.dict()
            user_doc["google_id"] = google_id
            user_doc["auth_provider"] = "google"
            
            await db.users.insert_one(user_doc)
            
            # Create access token
            access_token = create_access_token({"sub": user_id})
            
            return {
                "success": True,
                "access_token": access_token,
                "user": user,
                "workspace": workspace,
                "redirect_url": f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/dashboard?google_auth=success"
            }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to complete OAuth: {str(e)}")

@app.get("/api/google/auth")
async def google_auth(workspace_id: str, current_user: User = Depends(get_current_user)):
    """Initiate Google OAuth flow"""
    if workspace_id not in current_user.workspaces:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET or GOOGLE_CLIENT_ID == "your-google-client-id":
        # Return demo workspace integration for preview mode
        return {
            "demo_mode": True,
            "auth_url": f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/integrations?google_demo=true",
            "state": f"demo:{workspace_id}:{current_user.id}",
            "message": "Demo mode: This will simulate Google Workspace integration for preview purposes"
        }
    
    # Create OAuth flow
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [GOOGLE_REDIRECT_URI]
            }
        },
        scopes=GOOGLE_SCOPES
    )
    flow.redirect_uri = GOOGLE_REDIRECT_URI
    
    # Generate authorization URL
    auth_url, state = flow.authorization_url(
        prompt='consent',
        state=f"{workspace_id}:{current_user.id}"
    )
    
    return {"auth_url": auth_url, "state": state}

@app.post("/api/google/workspace/demo")
async def google_workspace_demo(workspace_id: str, current_user: User = Depends(get_current_user)):
    """Demo Google Workspace integration for preview mode"""
    if workspace_id not in current_user.workspaces:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Create demo integration
    integration = GoogleIntegration(
        id=str(uuid.uuid4()),
        workspace_id=workspace_id,
        user_id=current_user.id,
        service="google_workspace_demo",
        status=GoogleIntegrationStatus.CONNECTED,
        credentials={
            "google_user_id": "demo_google_123",
            "google_email": "demo.user@gmail.com",
            "google_name": "Demo User",
            "demo_mode": True
        },
        settings={"auto_sync": True, "sync_interval": 300},
        last_sync=datetime.utcnow(),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    # Check if demo integration already exists
    existing = await db.google_integrations.find_one({
        "workspace_id": workspace_id,
        "user_id": current_user.id,
        "service": "google_workspace_demo"
    })
    
    if not existing:
        await db.google_integrations.insert_one(integration.dict())
        
        # Create some demo documents
        demo_docs = [
            {
                "title": "Project Roadmap 2024",
                "doc_type": "document",
                "content": "This is a demo Google Doc with project roadmap information...",
                "url": "https://docs.google.com/document/d/demo1"
            },
            {
                "title": "Q4 Budget Analysis",
                "doc_type": "spreadsheet", 
                "content": "Demo spreadsheet with budget data and financial projections...",
                "url": "https://docs.google.com/spreadsheets/d/demo2"
            },
            {
                "title": "Team Presentation",
                "doc_type": "presentation",
                "content": "Demo presentation slides about team updates and goals...",
                "url": "https://docs.google.com/presentation/d/demo3"
            }
        ]
        
        for i, doc_data in enumerate(demo_docs):
            google_doc = GoogleDocument(
                id=str(uuid.uuid4()),
                workspace_id=workspace_id,
                integration_id=integration.id,
                google_id=f"demo_doc_{i+1}",
                title=doc_data["title"],
                content=doc_data["content"],
                doc_type=doc_data["doc_type"],
                url=doc_data["url"],
                last_modified=datetime.utcnow(),
                created_at=datetime.utcnow()
            )
            await db.google_documents.insert_one(google_doc.dict())
    
    return {
        "message": "Demo Google Workspace integration created successfully",
        "integration": integration,
        "documents_synced": 3
    }

@app.get("/api/google/callback")
async def google_callback(request: Request, code: str = None, state: str = None, error: str = None):
    """Handle Google OAuth callback"""
    if error:
        raise HTTPException(status_code=400, detail=f"OAuth error: {error}")
    
    if not code or not state:
        raise HTTPException(status_code=400, detail="Missing authorization code or state")
    
    try:
        # Parse state to get workspace_id and user_id
        workspace_id, user_id = state.split(":")
        
        # Create OAuth flow
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [GOOGLE_REDIRECT_URI]
                }
            },
            scopes=GOOGLE_SCOPES
        )
        flow.redirect_uri = GOOGLE_REDIRECT_URI
        
        # Exchange code for credentials
        flow.fetch_token(code=code)
        credentials = flow.credentials
        
        # Get user info from Google
        user_info_service = build('oauth2', 'v2', credentials=credentials)
        user_info = user_info_service.userinfo().get().execute()
        
        # Store integration in database
        integration = GoogleIntegration(
            id=str(uuid.uuid4()),
            workspace_id=workspace_id,
            user_id=user_id,
            service="google_workspace",
            status=GoogleIntegrationStatus.CONNECTED,
            credentials={
                "token": credentials.token,
                "refresh_token": credentials.refresh_token,
                "token_uri": credentials.token_uri,
                "client_id": credentials.client_id,
                "client_secret": credentials.client_secret,
                "scopes": credentials.scopes,
                "google_user_id": user_info.get("id"),
                "google_email": user_info.get("email"),
                "google_name": user_info.get("name")
            },
            settings={"auto_sync": True, "sync_interval": 300},
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        await db.google_integrations.insert_one(integration.dict())
        
        # Redirect to frontend success page
        return {"message": "Google Workspace connected successfully", "integration_id": integration.id}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to complete OAuth: {str(e)}")

@app.get("/api/workspaces/{workspace_id}/google/integrations")
async def get_google_integrations(workspace_id: str, current_user: User = Depends(get_current_user)):
    """Get all Google integrations for workspace"""
    if workspace_id not in current_user.workspaces:
        raise HTTPException(status_code=403, detail="Access denied")
    
    integrations_cursor = db.google_integrations.find({
        "workspace_id": workspace_id,
        "status": {"$ne": GoogleIntegrationStatus.DELETED}
    })
    
    integrations = []
    async for integration_doc in integrations_cursor:
        # Remove sensitive credentials from response
        integration_doc["credentials"] = {
            "google_email": integration_doc["credentials"].get("google_email"),
            "google_name": integration_doc["credentials"].get("google_name"),
            "connected": True
        }
        integrations.append(GoogleIntegration(**integration_doc))
    
    return integrations

@app.post("/api/workspaces/{workspace_id}/google/sync")
async def sync_google_data(workspace_id: str, integration_id: str, current_user: User = Depends(get_current_user)):
    """Sync data from Google Workspace"""
    if workspace_id not in current_user.workspaces:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get integration
    integration_doc = await db.google_integrations.find_one({
        "id": integration_id,
        "workspace_id": workspace_id
    })
    
    if not integration_doc:
        raise HTTPException(status_code=404, detail="Integration not found")
    
    try:
        # Recreate credentials
        credentials = Credentials(
            token=integration_doc["credentials"]["token"],
            refresh_token=integration_doc["credentials"]["refresh_token"],
            token_uri=integration_doc["credentials"]["token_uri"],
            client_id=integration_doc["credentials"]["client_id"],
            client_secret=integration_doc["credentials"]["client_secret"],
            scopes=integration_doc["credentials"]["scopes"]
        )
        
        # Sync Google Drive files
        drive_service = build('drive', 'v3', credentials=credentials)
        drive_results = drive_service.files().list(
            pageSize=50,
            fields="nextPageToken, files(id, name, mimeType, modifiedTime, webViewLink)"
        ).execute()
        
        drive_files = drive_results.get('files', [])
        synced_docs = []
        
        for file in drive_files:
            # Only sync documents, spreadsheets, and presentations
            if file['mimeType'] in [
                'application/vnd.google-apps.document',
                'application/vnd.google-apps.spreadsheet',
                'application/vnd.google-apps.presentation'
            ]:
                # Get document content based on type
                content = ""
                doc_type = "document"
                
                if file['mimeType'] == 'application/vnd.google-apps.document':
                    docs_service = build('docs', 'v1', credentials=credentials)
                    doc = docs_service.documents().get(documentId=file['id']).execute()
                    content = extract_text_from_google_doc(doc)
                    doc_type = "document"
                elif file['mimeType'] == 'application/vnd.google-apps.spreadsheet':
                    sheets_service = build('sheets', 'v4', credentials=credentials)
                    spreadsheet = sheets_service.spreadsheets().get(
                        spreadsheetId=file['id']
                    ).execute()
                    content = extract_text_from_google_sheet(spreadsheet)
                    doc_type = "spreadsheet"
                elif file['mimeType'] == 'application/vnd.google-apps.presentation':
                    slides_service = build('slides', 'v1', credentials=credentials)
                    presentation = slides_service.presentations().get(
                        presentationId=file['id']
                    ).execute()
                    content = extract_text_from_google_slides(presentation)
                    doc_type = "presentation"
                
                # Store in database
                google_doc = GoogleDocument(
                    id=str(uuid.uuid4()),
                    workspace_id=workspace_id,
                    integration_id=integration_id,
                    google_id=file['id'],
                    title=file['name'],
                    content=content,
                    doc_type=doc_type,
                    url=file['webViewLink'],
                    last_modified=datetime.fromisoformat(file['modifiedTime'].replace('Z', '+00:00')),
                    created_at=datetime.utcnow()
                )
                
                # Upsert document
                await db.google_documents.update_one(
                    {"google_id": file['id'], "workspace_id": workspace_id},
                    {"$set": google_doc.dict()},
                    upsert=True
                )
                
                synced_docs.append(google_doc)
        
        # Update last sync time
        await db.google_integrations.update_one(
            {"id": integration_id},
            {"$set": {"last_sync": datetime.utcnow()}}
        )
        
        return {
            "message": f"Synced {len(synced_docs)} documents",
            "documents": synced_docs
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")

@app.get("/api/workspaces/{workspace_id}/google/documents")
async def get_google_documents(workspace_id: str, current_user: User = Depends(get_current_user)):
    """Get all synced Google documents"""
    if workspace_id not in current_user.workspaces:
        raise HTTPException(status_code=403, detail="Access denied")
    
    docs_cursor = db.google_documents.find({"workspace_id": workspace_id}).sort("last_modified", -1)
    docs = []
    async for doc in docs_cursor:
        docs.append(GoogleDocument(**doc))
    
    return docs

@app.delete("/api/workspaces/{workspace_id}/google/integrations/{integration_id}")
async def disconnect_google_integration(
    workspace_id: str, 
    integration_id: str, 
    current_user: User = Depends(get_current_user)
):
    """Disconnect Google Workspace integration"""
    if workspace_id not in current_user.workspaces:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Update integration status
    result = await db.google_integrations.update_one(
        {"id": integration_id, "workspace_id": workspace_id},
        {"$set": {"status": GoogleIntegrationStatus.DISCONNECTED, "updated_at": datetime.utcnow()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Integration not found")
    
    return {"message": "Google Workspace integration disconnected"}

# Helper functions for content extraction
def extract_text_from_google_doc(doc):
    """Extract text from Google Doc"""
    text = ""
    content = doc.get('body', {}).get('content', [])
    for element in content:
        if 'paragraph' in element:
            paragraph = element['paragraph']
            for text_run in paragraph.get('elements', []):
                text_run_content = text_run.get('textRun', {})
                text += text_run_content.get('content', '')
    return text.strip()

def extract_text_from_google_sheet(spreadsheet):
    """Extract text from Google Sheets"""
    text = f"Spreadsheet: {spreadsheet.get('properties', {}).get('title', '')}\n\n"
    sheets = spreadsheet.get('sheets', [])
    for sheet in sheets:
        sheet_title = sheet.get('properties', {}).get('title', 'Untitled Sheet')
        text += f"Sheet: {sheet_title}\n"
        # Note: This is a simplified extraction. In production, you'd want to fetch actual cell values
        text += f"(Sheet data would be extracted here with additional API calls)\n\n"
    return text

def extract_text_from_google_slides(presentation):
    """Extract text from Google Slides"""
    text = f"Presentation: {presentation.get('title', '')}\n\n"
    slides = presentation.get('slides', [])
    for i, slide in enumerate(slides, 1):
        text += f"Slide {i}:\n"
        page_elements = slide.get('pageElements', [])
        for element in page_elements:
            if 'shape' in element:
                shape = element['shape']
                if 'text' in shape:
                    text_content = shape['text']
                    for text_element in text_content.get('textElements', []):
                        if 'textRun' in text_element:
                            text += text_element['textRun'].get('content', '')
        text += "\n\n"
    return text

# WebSocket for real-time chat
@app.websocket("/ws/{conversation_id}")
async def websocket_endpoint(websocket: WebSocket, conversation_id: str):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            # Process message (simplified for demo)
            await websocket.send_text(json.dumps({
                "type": "message",
                "content": f"Echo: {message_data.get('content', '')}"
            }))
            
    except WebSocketDisconnect:
        print(f"WebSocket disconnected for conversation {conversation_id}")

# Startup event
@app.on_event("startup")
async def startup_event():
    await init_db()
    print("VERSATIL API started successfully!")

# For development
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001, reload=True)