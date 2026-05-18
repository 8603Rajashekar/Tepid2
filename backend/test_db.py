import asyncio
from app.db.session import engine

async def test():
    async with engine.begin() as conn:
        print("Database connected successfully!")

asyncio.run(test())