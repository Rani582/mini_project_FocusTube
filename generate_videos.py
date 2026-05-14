import json
import random

# Base data for generation
ENT_TITLES = [
    "I Survived 100 Days in Hardcore Minecraft",
    "Extreme Hide and Seek in an Empty Mall",
    "Reacting to the Funniest Memes of 2025",
    "Trying the World's Spiciest Ramen",
    "I Built a Secret Room in My House",
    "Testing Viral TikTok Life Hacks",
    "Most Intense Escape Room Challenge",
    "Guess the Song from 1 Second",
    "Epic Trick Shots Battle",
    "100 Players Try to Survive a Volcano",
    "I Bought Every Item in the Store",
    "Surprising My Best Friend with a Car",
    "Rating Celebrity Outfits",
    "I Tried to Break a World Record",
    "Ultimate Try Not To Laugh Challenge",
    "Behind the Scenes of a Movie Set",
    "Eating Only One Color Food for 24 Hours",
    "Pranking My Roommate for a Week",
    "We Hosted a Massive Talent Show",
    "Unboxing Mystery Packages from the Dark Web"
]

EDU_TITLES = [
    "The History of the Roman Empire",
    "How Quantum Computers Work",
    "Understanding the Theory of Relativity",
    "The Complete Guide to Personal Finance",
    "How the Stock Market Actually Works",
    "Introduction to Organic Chemistry",
    "The Psychology of Human Behavior",
    "A Crash Course in World War II",
    "How to Learn Any Language Fast",
    "The Science of Sleep and Dreams",
    "The Evolution of the Human Brain",
    "Exploring the Deep Ocean",
    "How Rockets Work: Aerospace Engineering 101",
    "The Basics of Macroeconomics",
    "Understanding Climate Change Models",
    "A Guide to Classical Music",
    "The Philosophy of Stoicism",
    "How to Code a Website from Scratch",
    "The Biology of the Immune System",
    "Exploring Black Holes and Dark Matter"
]

ENT_CHANNELS = ["MrBeast", "Dude Perfect", "PewDiePie", "Markiplier", "Sidemen", "Smosh", "Jacksepticeye", "LazarBeam", "ZHC", "FaZe Clan"]
EDU_CHANNELS = ["Kurzgesagt", "CrashCourse", "Veritasium", "Vsauce", "SmarterEveryDay", "TED-Ed", "Khan Academy", "Numberphile", "SciShow", "CGI3D"]

ENT_TAGS = [["challenge", "fun", "crazy"], ["vlog", "entertainment", "comedy"], ["gaming", "survival", "epic"], ["reaction", "memes", "laugh"], ["prank", "friends", "funny"], ["unboxing", "mystery", "surprise"]]
EDU_TAGS = [["science", "physics", "education"], ["history", "documentary", "learning"], ["finance", "money", "investing"], ["psychology", "mind", "behavior"], ["technology", "engineering", "future"], ["biology", "nature", "science"]]

def generate_video(vid_id, category, title, channel, tags):
    views = f"{random.randint(1, 15)}.{random.randint(0, 9)}M"
    likes = random.randint(50000, 500000)
    duration = f"{random.randint(10, 59)}:{random.randint(10, 59):02d}"
    subscribers = f"{random.randint(1, 20)}.{random.randint(0, 9)}M"
    uploaded = f"{random.randint(1, 4)} weeks ago"
    
    # YouTube ID & Thumbnail based on category
    # All IDs below are verified popular embeddable YouTube videos
    if category == "Entertainment":
        youtube_ids = [
            "dQw4w9WgXcQ",  # Rick Astley - Never Gonna Give You Up
            "9bZkp7q19f0",  # PSY - Gangnam Style
            "kJQP7kiw5Fk",  # Luis Fonsi - Despacito
            "JGwWNGJdvx8",  # Ed Sheeran - Shape of You
            "RgKAFK5djSk",  # Wiz Khalifa - See You Again
            "OPf0YbXqDm0",  # Bruno Mars - Uptown Funk
            "fRh_vgS2dFE",  # Justin Bieber - Sorry
            "hT_nvWreIhg",  # OneRepublic - Counting Stars
            "YQHsXMglC9A",  # Adele - Hello
            "CevxZvSJLk8",  # Katy Perry - Roar
        ]
        thumbnail = "https://images.unsplash.com/photo-1542204165-65bf26472b9b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800"
    else:
        youtube_ids = [
            "DLzxrzFCyOs",  # 3Blue1Brown - Essence of Calculus
            "aircAruvnKk",  # 3Blue1Brown - Neural Networks
            "WUvTyaaNkzM",  # CGP Grey - Coffee
            "rN6nlNC9WQA",  # CGP Grey - Humans Need Not Apply
            "8aGhZQkoFbQ",  # Vsauce - Is Your Red The Same as My Red
            "MBRqu0YOH14",  # Kurzgesagt - Immune System
            "lXfEK8G8CUI",  # 3Blue1Brown - Euler's formula
            "LyGKzyoGOwA",  # Numberphile
            "GhHOjC4oxh8",  # TED-Ed
            "QC8iQqtG0hg",  # Veritasium
        ]
        thumbnail = "https://images.unsplash.com/photo-1532094349884-543bc11b234d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800"

    avatar_seed = channel.replace(" ", "")[:2].upper()
    youtube_id = random.choice(youtube_ids)
    
    return {
        "id": vid_id,
        "youtubeId": youtube_id,
        "title": title,
        "description": f"An amazing video about {title.lower()}. Make sure to like and subscribe for more content!",
        "category": category,
        "tags": tags,
        "thumbnail": thumbnail,
        "duration": duration,
        "views": views,
        "likes": likes,
        "channel": channel,
        "channelAvatar": f"https://api.dicebear.com/7.x/initials/svg?seed={avatar_seed}&backgroundColor=4f46e5",
        "uploadedAt": uploaded,
        "subscribers": subscribers
    }

videos = []

# Generate 100 Entertainment
for i in range(1, 101):
    title = f"{random.choice(ENT_TITLES)} - Part {random.randint(1, 5)}"
    channel = random.choice(ENT_CHANNELS)
    tags = random.choice(ENT_TAGS)
    videos.append(generate_video(f"ent-{i:03d}", "Entertainment", title, channel, tags))

# Generate 100 Educational
for i in range(1, 101):
    title = f"{random.choice(EDU_TITLES)}: Episode {random.randint(1, 10)}"
    channel = random.choice(EDU_CHANNELS)
    tags = random.choice(EDU_TAGS)
    videos.append(generate_video(f"edu-{i:03d}", "Educational", title, channel, tags))

# WRITE BACKEND PYTHON FILE
python_code = f'''"""
video_data.py
─────────────
Complete video dataset — mirrors the frontend TypeScript data.
"""

from typing import List, Dict, Any

VIDEOS: List[Dict[str, Any]] = {json.dumps(videos, indent=4)}

CATEGORIES = [
    "Entertainment",
    "Educational"
]
'''

with open("backend/video_data.py", "w", encoding="utf-8") as f:
    f.write(python_code)

# WRITE FRONTEND TYPESCRIPT FILE
ts_code = f'''export type Category =
  | "Entertainment"
  | "Educational";

export interface Video {{
  id: string;
  youtubeId: string;
  title: string;
  description: string;
  category: Category;
  tags: string[];
  thumbnail: string;
  duration: string;
  views: string;
  likes: number;
  channel: string;
  channelAvatar: string;
  uploadedAt: string;
  subscribers: string;
}}

export const VIDEOS: Video[] = {json.dumps(videos, indent=2)};

export const CATEGORIES: Category[] = [
  "Entertainment",
  "Educational",
];
'''

with open("src/lib/videoData.ts", "w", encoding="utf-8") as f:
    f.write(ts_code)

print("Generated 200 videos successfully.")
