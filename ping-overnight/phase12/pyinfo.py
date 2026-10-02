import sys
print(sys.version)
print(sys.path)
try:
    import psycopg2
    print("psycopg2:", psycopg2.__file__)
except Exception as e:
    print("psycopg2 import failed:", e)
