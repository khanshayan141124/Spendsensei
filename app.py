from flask import Flask, request, jsonify, render_template
import sqlite3
from datetime import datetime, timedelta

app = Flask(__name__)

def get_db():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/')
def home():
    conn = get_db()
    # archived=0 is your active day, archived=1 is saved history
    conn.execute('''CREATE TABLE IF NOT EXISTS expenses 
                    (id INTEGER PRIMARY KEY AUTOINCREMENT, 
                     amount REAL, category TEXT, currency TEXT, 
                     date TEXT, archived INTEGER DEFAULT 0)''')
    conn.close()
    return render_template('index.html')

@app.route('/add', methods=['POST'])
def add():
    data = request.get_json()
    # Store in YYYY-MM-DD for perfect database sorting
    today = datetime.now().strftime('%Y-%m-%d')
    conn = get_db()
    conn.execute("INSERT INTO expenses (amount, category, currency, date, archived) VALUES (?, ?, ?, ?, 0)",
                 (data['amount'], data['category'], data['currency'], today))
    conn.commit()
    conn.close()
    return jsonify({"status": "success"})

@app.route('/dashboard_data')
def dashboard_data():
    conn = get_db()
    cursor = conn.cursor()
    
    # 1. Get Current List
    cursor.execute("SELECT * FROM expenses WHERE archived = 0 ORDER BY id DESC")
    current_list = [dict(row) for row in cursor.fetchall()]
    
    # 2. Get Current Total
    cursor.execute("SELECT SUM(amount) FROM expenses WHERE archived = 0")
    total = cursor.fetchone()[0] or 0
    
    # 3. Get Chart Data (Grouped by Category)
    cursor.execute("SELECT category, SUM(amount) as amt FROM expenses WHERE archived = 0 GROUP BY category")
    chart_data = [{"category": row[0], "amount": row[1]} for row in cursor.fetchall()]
    
    conn.close()
    return jsonify({"total": total, "list": current_list, "chart": chart_data})

@app.route('/save_day', methods=['POST'])
def save_day():
    conn = get_db()
    conn.execute("UPDATE expenses SET archived = 1 WHERE archived = 0")
    conn.commit()
    conn.close()
    return jsonify({"status": "success"})

@app.route('/history')
def history():
    timeframe = request.args.get('timeframe', 'all')
    conn = get_db()
    cursor = conn.cursor()
    
    query = "SELECT * FROM expenses WHERE archived = 1"
    params = []
    
    if timeframe == 'week':
        week_ago = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
        query += " AND date >= ?"
        params.append(week_ago)
    elif timeframe == 'month':
        month_ago = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
        query += " AND date >= ?"
        params.append(month_ago)
        
    query += " ORDER BY date DESC, id DESC"
    cursor.execute(query, params)
    
    history_list = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(history_list)

@app.route('/delete/<int:id>', methods=['DELETE'])
def delete(id):
    conn = get_db()
    conn.execute("DELETE FROM expenses WHERE id = ?", (id,))
    conn.commit()
    conn.close()
    return jsonify({"status": "success"})

if __name__ == '__main__':
    app.run(debug=True)