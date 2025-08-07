from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect, UploadFile, File
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
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
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
            response = await openai.ChatCompletion.acreate(
                model=assistant.model,
                messages=[
                    {"role": "system", "content": assistant.system_prompt},
                    {"role": "user", "content": message_data["content"]}
                ],
                max_tokens=1000
            )
            ai_content = response.choices[0].message.content
        else:
            # Use Anthropic
            response = await anthropic_client.messages.create(
                model="claude-3-sonnet-20240229",
                max_tokens=1000,
                messages=[{"role": "user", "content": message_data["content"]}],
                system=assistant.system_prompt
            )
            ai_content = response.content[0].text
        
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