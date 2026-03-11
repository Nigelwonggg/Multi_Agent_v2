"""
Centralized logging configuration for LangGraph Chat API
"""
import logging
import sys
import os
from pathlib import Path
from typing import Optional

class ColoredFormatter(logging.Formatter):
    """Custom formatter with colors for console output"""
    
    # ANSI color codes
    COLORS = {
        'DEBUG': '\033[36m',    # Cyan
        'INFO': '\033[32m',     # Green
        'WARNING': '\033[33m',  # Yellow
        'ERROR': '\033[31m',    # Red
        'CRITICAL': '\033[35m', # Magenta
        'RESET': '\033[0m'      # Reset
    }
    
    def format(self, record):
        # Add color to levelname
        levelname = record.levelname
        if levelname in self.COLORS:
            record.levelname = f"{self.COLORS[levelname]}{levelname}{self.COLORS['RESET']}"
        
        # Format the message
        formatted = super().format(record)
        
        # Reset levelname for future use
        record.levelname = levelname
        
        return formatted

def setup_logging(
    log_level: str = "DEBUG",
    log_file: Optional[str] = "langgraph_chat.log",
    enable_file_logging: bool = True,
    enable_console_logging: bool = True
) -> logging.Logger:
    """
    Configure centralized logging for the application
    
    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_file: Path to log file (None to disable file logging)
        enable_file_logging: Enable file logging
        enable_console_logging: Enable console logging
    
    Returns:
        Configured logger
    """
    
    # Clear existing handlers to avoid duplicates
    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    
    # Set root logger level
    numeric_level = getattr(logging, log_level.upper(), logging.INFO)
    root_logger.setLevel(numeric_level)
    
    handlers = []
    
    # Console handler with colors
    if enable_console_logging:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(numeric_level)
        
        console_formatter = ColoredFormatter(
            '%(asctime)s - [%(name)s] - %(levelname)s - %(message)s',
            datefmt='%H:%M:%S'
        )
        console_handler.setFormatter(console_formatter)
        handlers.append(console_handler)
    
    # File handler
    if enable_file_logging and log_file:
        # Create logs directory if it doesn't exist
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        
        file_handler = logging.FileHandler(log_file, encoding='utf-8')
        file_handler.setLevel(logging.DEBUG)  # Always debug level for files
        
        file_formatter = logging.Formatter(
            '%(asctime)s - [%(name)s] - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        file_handler.setFormatter(file_formatter)
        handlers.append(file_handler)
    
    # Add all handlers to root logger
    for handler in handlers:
        root_logger.addHandler(handler)
    
    # Configure specific loggers to reduce noise
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.error").setLevel(logging.INFO)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("openai").setLevel(logging.WARNING)
    logging.getLogger("langchain").setLevel(logging.INFO)
    logging.getLogger("urllib3.connectionpool").setLevel(logging.WARNING)
    logging.getLogger("langsmith.client").setLevel(logging.WARNING)
    
    # Return a logger for the calling module
    return logging.getLogger(__name__)

def get_logger(name: str) -> logging.Logger:
    """
    Get a logger for a specific module/class
    
    Args:
        name: Name of the logger (usually __name__ or class name)
    
    Returns:
        Configured logger instance
    """
    return logging.getLogger(name)

def log_function_call(func_name: str, logger: logging.Logger, level: str = "DEBUG"):
    """
    Decorator to log function calls
    
    Args:
        func_name: Name of the function
        logger: Logger instance
        level: Log level
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            getattr(logger, level.lower())(f"🔧 Calling {func_name}")
            try:
                result = func(*args, **kwargs)
                getattr(logger, level.lower())(f"✅ {func_name} completed successfully")
                return result
            except Exception as e:
                logger.error(f"❌ Error in {func_name}: {str(e)}")
                raise
        return wrapper
    return decorator

# Initialize logging when module is imported
def init_logging():
    """Initialize logging with environment variables"""
    log_level = os.getenv("LOG_LEVEL", "DEBUG")
    log_file = os.getenv("LOG_FILE", "logs/langgraph_chat.log")
    enable_file_logging = os.getenv("ENABLE_FILE_LOGGING", "true").lower() == "true"
    
    return setup_logging(
        log_level=log_level,
        log_file=log_file if enable_file_logging else None,
        enable_file_logging=enable_file_logging
    )

# Auto-initialize when imported
_logger = init_logging()