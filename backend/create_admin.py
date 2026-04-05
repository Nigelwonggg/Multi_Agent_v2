from sqlalchemy.orm import Session
from app.databases.chat_database import engine, SessionLocal, Base
from app.models.user_model import User
from app.utils.auth_utils import get_password_hash

def create_manual_user():
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        email = "admin@test.com"
        role = "lecturer" # Defined role variable
        
        # Check if user exists
        user = db.query(User).filter(User.email == email).first()
        if user:
            print(f"User {email} already exists!")
            return

        new_user = User(
            email=email,
            hashed_password=get_password_hash("password123"),
            full_name="Admin Lecturer",
            role=role,
            security_question="What is your pet's name?",
            security_answer="AdminPet"
        )
        db.add(new_user)
        db.commit()
        print(f"✅ Successfully created {role} account!")
        print(f"Email: {email}")
        print(f"Password: password123")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_manual_user()
