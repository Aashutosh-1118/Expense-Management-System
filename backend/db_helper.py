# CRUD
# C- create
# R - recreate
# U - update
# D - delete

import mysql.connector
from mysql.connector import pooling
from contextlib import contextmanager
from logging_setup import setup_logger
import os
from dotenv import load_dotenv

load_dotenv()
logger = setup_logger('db_helper')

# Pool is created once at import time — connections are borrowed and returned,
# never closed and recreated per request.
connection_pool = pooling.MySQLConnectionPool(
    pool_name="expense_pool",
    pool_size=5,          # max concurrent connections; tune based on load
    host=os.getenv("DB_HOST"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    database=os.getenv("DB_NAME"),
)

@contextmanager
def get_db_cursor(commit=False):
    conn = connection_pool.get_connection()   # borrow from pool
    cursor = conn.cursor(dictionary=True)
    try:
        yield cursor
        if commit:
            conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()   # returns connection to pool, doesn't actually close it

def create_user(email, hashed_password):
    logger.info(f"create_user called with {email}")
    with get_db_cursor(commit=True) as cursor:
        cursor.execute(
            "INSERT INTO users(email, hashed_password) VALUES (%s, %s)",
            (email, hashed_password)
        )
        return cursor.lastrowid   # gives back the new user's id


def get_user_by_email(email):
    logger.info(f"get_user_by_email called with {email}")
    with get_db_cursor() as cursor:
        cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()
        return user

def fetch_expenses_for_date(user_id, expense_date):
    logger.info(f"fetch_expenses_for_date called with user {user_id}, {expense_date}")
    with get_db_cursor() as cursor:
        cursor.execute(
            "SELECT * FROM expenses WHERE user_id = %s AND expense_date = %s",
            (user_id, expense_date)
        )
        return cursor.fetchall()


def delete_expenses_for_date(user_id, expense_date):
    logger.info(f"delete_expenses_for_date called with user {user_id}, {expense_date}")
    with get_db_cursor(commit=True) as cursor:
        cursor.execute(
            "DELETE FROM expenses WHERE user_id = %s AND expense_date = %s",
            (user_id, expense_date)
        )


def insert_expense(user_id, expense_date, amount, category, notes):
    logger.info(f"insert_expense called with user {user_id}, {expense_date}, amount: {amount}")
    with get_db_cursor(commit=True) as cursor:
        cursor.execute(
            "INSERT INTO expenses(user_id, expense_date, amount, category, notes) VALUES (%s, %s, %s, %s, %s)",
            (user_id, expense_date, amount, category, notes)
        )


def fetch_expense_summary(user_id, start_date, end_date):
    logger.info(f"fetch_expense_summary called with user {user_id}, {start_date} to {end_date}")
    with get_db_cursor() as cursor:
        cursor.execute(
            '''SELECT category, SUM(amount) as total 
            FROM expenses WHERE user_id = %s AND expense_date BETWEEN %s AND %s
            GROUP BY category;''',
            (user_id, start_date, end_date)
        )
        return cursor.fetchall()