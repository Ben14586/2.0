import sqlite3

c = sqlite3.connect('database.db')
print("Lighting Princess:")
print(c.execute("SELECT name, play_image FROM games WHERE name LIKE '%Lighting%'").fetchone())
print("Shadow Knight:")
print(c.execute("SELECT name, play_image FROM games WHERE name LIKE '%Shadow%'").fetchone())
