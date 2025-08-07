import requests
import sys
import json
from datetime import datetime
import uuid

class VERSATILAPITester:
    def __init__(self, base_url="https://13429d29-f39e-4cd5-90cd-ab570819d5ef.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_data = None
        self.workspace_data = None
        self.assistant_id = None
        self.conversation_id = None
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    return success, response_data
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test API health check"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "api/health",
            200
        )
        return success

    def test_register(self):
        """Test user registration"""
        test_email = f"test_user_{datetime.now().strftime('%H%M%S')}@example.com"
        test_data = {
            "email": test_email,
            "password": "TestPass123!",
            "name": "Test User",
            "workspace_name": "Test Workspace"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "api/auth/register",
            200,
            data=test_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_data = response['user']
            self.workspace_data = response['workspace']
            print(f"   Registered user: {self.user_data['email']}")
            print(f"   Workspace: {self.workspace_data['name']}")
        
        return success

    def test_login(self):
        """Test user login with existing user"""
        if not self.user_data:
            print("❌ No user data available for login test")
            return False
            
        login_data = {
            "email": self.user_data['email'],
            "password": "TestPass123!"
        }
        
        success, response = self.run_test(
            "User Login",
            "POST",
            "api/auth/login",
            200,
            data=login_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"   Logged in user: {response['user']['email']}")
        
        return success

    def test_verify_token(self):
        """Test token verification"""
        success, response = self.run_test(
            "Token Verification",
            "GET",
            "api/auth/verify",
            200
        )
        return success

    def test_get_workspaces(self):
        """Test getting user workspaces"""
        success, response = self.run_test(
            "Get Workspaces",
            "GET",
            "api/workspaces",
            200
        )
        
        if success and isinstance(response, list) and len(response) > 0:
            print(f"   Found {len(response)} workspace(s)")
        
        return success

    def test_create_assistant(self):
        """Test creating an AI assistant"""
        if not self.workspace_data:
            print("❌ No workspace data available")
            return False
            
        assistant_data = {
            "name": "Test Assistant",
            "description": "A test AI assistant",
            "type": "chat",
            "model": "gpt-4",
            "system_prompt": "You are a helpful AI assistant for testing purposes.",
            "instructions": "Be helpful and concise in your responses."
        }
        
        success, response = self.run_test(
            "Create Assistant",
            "POST",
            f"api/workspaces/{self.workspace_data['id']}/assistants",
            200,
            data=assistant_data
        )
        
        if success and 'id' in response:
            self.assistant_id = response['id']
            print(f"   Created assistant: {response['name']} (ID: {self.assistant_id})")
        
        return success

    def test_get_assistants(self):
        """Test getting workspace assistants"""
        if not self.workspace_data:
            print("❌ No workspace data available")
            return False
            
        success, response = self.run_test(
            "Get Assistants",
            "GET",
            f"api/workspaces/{self.workspace_data['id']}/assistants",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} assistant(s)")
        
        return success

    def test_get_assistant(self):
        """Test getting specific assistant"""
        if not self.workspace_data or not self.assistant_id:
            print("❌ No workspace or assistant data available")
            return False
            
        success, response = self.run_test(
            "Get Assistant Details",
            "GET",
            f"api/workspaces/{self.workspace_data['id']}/assistants/{self.assistant_id}",
            200
        )
        
        if success and 'name' in response:
            print(f"   Assistant: {response['name']}")
        
        return success

    def test_update_assistant(self):
        """Test updating assistant"""
        if not self.workspace_data or not self.assistant_id:
            print("❌ No workspace or assistant data available")
            return False
            
        update_data = {
            "name": "Updated Test Assistant",
            "description": "An updated test AI assistant"
        }
        
        success, response = self.run_test(
            "Update Assistant",
            "PUT",
            f"api/workspaces/{self.workspace_data['id']}/assistants/{self.assistant_id}",
            200,
            data=update_data
        )
        
        if success and 'name' in response:
            print(f"   Updated assistant: {response['name']}")
        
        return success

    def test_create_conversation(self):
        """Test creating a conversation"""
        if not self.workspace_data or not self.assistant_id:
            print("❌ No workspace or assistant data available")
            return False
            
        conversation_data = {
            "assistant_id": self.assistant_id,
            "title": "Test Conversation"
        }
        
        success, response = self.run_test(
            "Create Conversation",
            "POST",
            f"api/workspaces/{self.workspace_data['id']}/conversations",
            200,
            data=conversation_data
        )
        
        if success and 'id' in response:
            self.conversation_id = response['id']
            print(f"   Created conversation: {response['title']} (ID: {self.conversation_id})")
        
        return success

    def test_get_conversations(self):
        """Test getting conversations"""
        if not self.workspace_data:
            print("❌ No workspace data available")
            return False
            
        success, response = self.run_test(
            "Get Conversations",
            "GET",
            f"api/workspaces/{self.workspace_data['id']}/conversations",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} conversation(s)")
        
        return success

    def test_send_message(self):
        """Test sending a message in conversation"""
        if not self.conversation_id:
            print("❌ No conversation data available")
            return False
            
        message_data = {
            "content": "Hello, this is a test message!"
        }
        
        success, response = self.run_test(
            "Send Message",
            "POST",
            f"api/conversations/{self.conversation_id}/messages",
            200,
            data=message_data
        )
        
        if success and 'user_message' in response and 'assistant_message' in response:
            print(f"   User message: {response['user_message']['content']}")
            print(f"   AI response: {response['assistant_message']['content'][:100]}...")
        
        return success

    def test_get_messages(self):
        """Test getting conversation messages"""
        if not self.conversation_id:
            print("❌ No conversation data available")
            return False
            
        success, response = self.run_test(
            "Get Messages",
            "GET",
            f"api/conversations/{self.conversation_id}/messages",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} message(s)")
        
        return success

    def test_google_demo_auth(self):
        """Test Google demo authentication"""
        success, response = self.run_test(
            "Google Demo Auth",
            "POST",
            "api/auth/google/demo",
            200
        )
        
        if success and 'access_token' in response:
            print(f"   Demo user: {response['user']['email']}")
        
        return success

    def test_google_workspace_demo(self):
        """Test Google Workspace demo integration"""
        if not self.workspace_data:
            print("❌ No workspace data available")
            return False
            
        success, response = self.run_test(
            "Google Workspace Demo",
            "POST",
            f"api/google/workspace/demo?workspace_id={self.workspace_data['id']}",
            200
        )
        
        if success and 'integration' in response:
            print(f"   Demo integration created: {response['integration']['service']}")
            print(f"   Documents synced: {response.get('documents_synced', 0)}")
        
        return success

    def test_get_google_integrations(self):
        """Test getting Google integrations"""
        if not self.workspace_data:
            print("❌ No workspace data available")
            return False
            
        success, response = self.run_test(
            "Get Google Integrations",
            "GET",
            f"api/workspaces/{self.workspace_data['id']}/google/integrations",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} integration(s)")
        
        return success

    def test_get_google_documents(self):
        """Test getting Google documents"""
        if not self.workspace_data:
            print("❌ No workspace data available")
            return False
            
        success, response = self.run_test(
            "Get Google Documents",
            "GET",
            f"api/workspaces/{self.workspace_data['id']}/google/documents",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} document(s)")
        
        return success

    def test_delete_assistant(self):
        """Test deleting assistant (cleanup)"""
        if not self.workspace_data or not self.assistant_id:
            print("❌ No workspace or assistant data available")
            return False
            
        success, response = self.run_test(
            "Delete Assistant",
            "DELETE",
            f"api/workspaces/{self.workspace_data['id']}/assistants/{self.assistant_id}",
            200
        )
        
        if success:
            print(f"   Assistant deleted successfully")
        
        return success

def main():
    print("🚀 Starting VERSATIL API Testing...")
    print("=" * 60)
    
    tester = VERSATILAPITester()
    
    # Test sequence
    tests = [
        ("Health Check", tester.test_health_check),
        ("User Registration", tester.test_register),
        ("User Login", tester.test_login),
        ("Token Verification", tester.test_verify_token),
        ("Get Workspaces", tester.test_get_workspaces),
        ("Create Assistant", tester.test_create_assistant),
        ("Get Assistants", tester.test_get_assistants),
        ("Get Assistant Details", tester.test_get_assistant),
        ("Update Assistant", tester.test_update_assistant),
        ("Create Conversation", tester.test_create_conversation),
        ("Get Conversations", tester.test_get_conversations),
        ("Send Message", tester.test_send_message),
        ("Get Messages", tester.test_get_messages),
        ("Google Demo Auth", tester.test_google_demo_auth),
        ("Google Workspace Demo", tester.test_google_workspace_demo),
        ("Get Google Integrations", tester.test_get_google_integrations),
        ("Get Google Documents", tester.test_get_google_documents),
        ("Delete Assistant", tester.test_delete_assistant),
    ]
    
    # Run all tests
    for test_name, test_func in tests:
        try:
            test_func()
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {str(e)}")
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 FINAL RESULTS:")
    print(f"   Tests Run: {tester.tests_run}")
    print(f"   Tests Passed: {tester.tests_passed}")
    print(f"   Tests Failed: {tester.tests_run - tester.tests_passed}")
    print(f"   Success Rate: {(tester.tests_passed/tester.tests_run*100):.1f}%" if tester.tests_run > 0 else "0%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print("⚠️  Some tests failed - check logs above")
        return 1

if __name__ == "__main__":
    sys.exit(main())