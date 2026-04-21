import sys
import os

# Add the current directory to sys.path so we can import 'app'
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.databases.chat_database import engine, SessionLocal, Base, init_db
from app.models.user_model import User, AllowedUser
from app.utils.auth_utils import get_password_hash

def initialize_test_accounts():
    # Ensure tables exist
    init_db()
    
    db = SessionLocal()
    try:
        test_accounts = [
            {
                "email": "admin@test.com",
                "password": "password123",
                "full_name": "Admin Lecturer",
                "role": "lecturer",
                "security_question": "What is your pet's name?",
                "security_answer": "AdminPet",
                "student_id": "ADMIN001"
            },
            {
                "email": "student@test.com",
                "password": "password123",
                "full_name": "Student Test",
                "role": "student",
                "security_question": "What is your pet's name?",
                "security_answer": "StudentPet",
                "student_id": "STUDENT001"
            }
        ]

        for acc in test_accounts:
            # Delete if exists to ensure clean slate
            db.query(User).filter(User.email == acc["email"]).delete()
            db.query(AllowedUser).filter(AllowedUser.student_id == acc["student_id"]).delete()
            
            # Also ensure they are in AllowedUser table if needed by logic
            allowed = db.query(AllowedUser).filter(AllowedUser.student_id == acc["student_id"]).first()
            if not allowed:
                new_allowed = AllowedUser(
                    student_id=acc["student_id"],
                    name=acc["full_name"],
                    role=acc["role"]
                )
                db.add(new_allowed)

            new_user = User(
                email=acc["email"],
                hashed_password=get_password_hash(acc["password"]),
                full_name=acc["full_name"],
                role=acc["role"],
                security_question=acc["security_question"],
                security_answer=acc["security_answer"],
                student_id=acc["student_id"]
            )
            db.add(new_user)
            print(f"✅ Reset and created account: {acc['email']} (Password: {acc['password']})")

        db.commit()
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    initialize_test_accounts()
