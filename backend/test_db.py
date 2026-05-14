import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

async def main():
    load_dotenv()
    uri = os.getenv('MONGODB_URI')
    print(f"Connecting to: {uri.replace(uri.split('@')[0].split(':')[2], '***') if '@' in uri else uri}")
    try:
        client = AsyncIOMotorClient(uri, serverSelectionTimeoutMS=5000)
        await client.admin.command('ping')
        print("SUCCESS: Connected to MongoDB!")
    except Exception as e:
        print(f"FAILED: {e}")

if __name__ == "__main__":
    asyncio.run(main())
