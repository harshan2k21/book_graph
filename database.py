from neo4j import GraphDatabase
import logging

# Set up basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class Neo4jConnection:
    def __init__(self, uri, user, pwd):
        self.__uri = uri
        self.__user = user
        self.__pwd = pwd
        self.__driver = None
        try:
            self.__driver = GraphDatabase.driver(self.__uri, auth=(self.__user, self.__pwd))
            logger.info("Successfully connected to Neo4j.")
        except Exception as e:
            logger.error("Failed to create the driver:", e)
        
    def close(self):
        if self.__driver is not None:
            self.__driver.close()
            logger.info("Neo4j connection closed.")

    def query(self, query, parameters=None, db=None):
        assert self.__driver is not None, "Driver not initialized!"
        session = None
        response = None
        try:
            # db="neo4j" is the default database name
            session = self.__driver.session(database=db) if db is not None else self.__driver.session() 
            response = list(session.run(query, parameters))
        except Exception as e:
            logger.error(f"Query failed: {e}")
        finally:
            if session is not None:
                session.close()
        return response

# Initialize the connection using the credentials from our Docker setup
db_conn = Neo4jConnection("bolt://localhost:7687", "neo4j", "bookgraph123")