from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from datetime import date
import db_helper
import auth
from typing import List
from pydantic import BaseModel

app = FastAPI()

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


# ---------- Schemas ----------
class Expense(BaseModel):
    amount: float
    category: str
    notes: str

class DateRange(BaseModel):
    start_date: date
    end_date: date

class UserSignup(BaseModel):
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str


# ---------- Auth dependency ----------
def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = auth.decode_access_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user_id = payload.get("user_id")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    return user_id


# ---------- Auth routes ----------
@app.post("/auth/signup", status_code=201)
def signup(user: UserSignup):
    existing = db_helper.get_user_by_email(user.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_pw = auth.hash_password(user.password)
    user_id = db_helper.create_user(user.email, hashed_pw)
    return {"message": "User created successfully", "user_id": user_id}


@app.post("/auth/login")
def login(user: UserLogin):
    db_user = db_helper.get_user_by_email(user.email)
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not auth.verify_password(user.password, db_user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = auth.create_access_token({"user_id": db_user["id"], "email": db_user["email"]})
    return {"access_token": token, "token_type": "bearer"}


# ---------- Expense routes (now protected) ----------
@app.get("/expenses/{expense_date}", response_model=List[Expense])
def get_expenses(expense_date: date, user_id: int = Depends(get_current_user)):
    expenses = db_helper.fetch_expenses_for_date(user_id, expense_date)
    return expenses


@app.put("/expenses/{expense_date}")
def add_or_update_expense(expense_date: date, expenses: List[Expense], user_id: int = Depends(get_current_user)):
    db_helper.delete_expenses_for_date(user_id, expense_date)
    for expense in expenses:
        db_helper.insert_expense(user_id, expense_date, expense.amount, expense.category, expense.notes)
    return {"message": "Expenses updated successfully"}


@app.post("/analytics/")
def get_analytics(date_range: DateRange, user_id: int = Depends(get_current_user)):
    data = db_helper.fetch_expense_summary(user_id, date_range.start_date, date_range.end_date)

    total = sum([row['total'] for row in data])
    breakdown = {}
    for row in data:
        percentage = (row['total'] / total) * 100 if total != 0 else 0
        breakdown[row['category']] = {
            "total": row['total'],
            "percentage": percentage,
        }
    return breakdown