from app.databases.chat_database import SessionLocal
from app.models.user_model import User
from app.utils.auth_utils import get_password_hash

def migrate_passwords():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        print(f"Found {len(users)} users. Updating passwords to new hash format...")
        
        for user in users:
            # We don't know the plain password, so we'll reset everyone's 
            # password to 'password123' for this migration, or you can skip this
            # and just sign up again. 
            # Since it's local dev, resetting to 'password123' is easiest.
            user.hashed_password = get_password_hash("password123")
            print(f"Updated password for: {user.email}")
        
        db.commit()
        print("✅ All local passwords updated to pbkdf2_sha256 format.")
        print("Default password for all users is now: password123")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate_passwords()
