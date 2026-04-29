import os
import requests
import logging
from typing import List, Dict, Any
from dotenv import load_dotenv
from google.adk.tools import FunctionTool

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

CALENDARIFIC_API_KEY = os.getenv("CALENDARIFIC_API_KEY", "")

def get_holidays(country_code: str, year: int) -> List[Dict[str, Any]]:
    """
    Get all holidays for a specific country and year.
    """
    try:
        url = "https://calendarific.com/api/v2/holidays"
        params = {
            "api_key": CALENDARIFIC_API_KEY,
            "country": country_code,
            "year": year
        }
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        return data.get("response", {}).get("holidays", [])
    except Exception as e:
        logger.error(f"Error fetching holidays: {e}")
        return []

def is_holiday(date_str: str, country_code: str) -> bool:
    """
    Check if a specific date (YYYY-MM-DD) is a holiday.
    """
    try:
        year = int(date_str.split("-")[0])
        holidays = get_holidays(country_code, year)
        
        for holiday in holidays:
            date_info = holiday.get("date", {}).get("iso", "")
            if date_str in date_info:
                return True
        return False
    except Exception as e:
        logger.error(f"Error checking if holiday: {e}")
        return False

# Wrap as FunctionTool
get_holidays_tool = FunctionTool(get_holidays)
is_holiday_tool = FunctionTool(is_holiday)

all_tools = [get_holidays_tool, is_holiday_tool]
