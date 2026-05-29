import os
import hashlib
from django.conf import settings
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_community.vectorstores import FAISS
from langchain_classic.chains import RetrievalQA

def get_pdf_hash(pdf_path: str) -> str:
    """Generate a clean MD5 hash of the PDF path to serve as a unique FAISS index cache directory name."""
    return hashlib.md5(pdf_path.encode('utf-8')).hexdigest()

def answer_question(pdf_path: str, question: str) -> str:
    """
    Renders academic vector QA retrieval on a target PDF using LangChain + FAISS + Gemini.
    Caches the FAISS database directory to prevent indexing on every query.
    """
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"PDF file not found at: {pdf_path}")

    # Set up cache directories inside MEDIA_ROOT/faiss_cache/
    cache_root = os.path.join(settings.MEDIA_ROOT, 'faiss_cache')
    os.makedirs(cache_root, exist_ok=True)
    
    pdf_hash = get_pdf_hash(pdf_path)
    faiss_index_dir = os.path.join(cache_root, f"index_{pdf_hash}")

    # Ensure GOOGLE_API_KEY is present
    api_key = getattr(settings, 'GOOGLE_API_KEY', None)
    if not api_key:
        api_key = os.getenv("GOOGLE_API_KEY", "")
    
    # Initialize embeddings
    embeddings = GoogleGenerativeAIEmbeddings(
        model="models/gemini-embedding-001",
        google_api_key=api_key
    )

    vector_store = None

    # Load FAISS index if already cached
    if os.path.exists(faiss_index_dir):
        try:
            vector_store = FAISS.load_local(
                faiss_index_dir, 
                embeddings, 
                allow_dangerous_deserialization=True  # Django backend is private and verified
            )
        except Exception as e:
            print(f"Error loading cached FAISS index: {e}. Re-indexing document...")
            vector_store = None

    # Create new FAISS index if not cached or failed to load
    if not vector_store:
        # 1. Load PDF
        loader = PyPDFLoader(pdf_path)
        docs = loader.load()

        # Quota-Protection Check: Only index the first 20 pages of large documents on free-tier API keys
        # to prevent instant 429 rate limit quota exhaustion (limit of 100 requests per minute).
        if len(docs) > 20:
            docs = docs[:20]

        # 2. Split Text with optimal chunk sizing to generate fewer, high-context chunks
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=3000, chunk_overlap=300)
        splits = text_splitter.split_documents(docs)

        # 3. Store in FAISS
        vector_store = FAISS.from_documents(splits, embeddings)
        
        # Cache local index
        vector_store.save_local(faiss_index_dir)

    # 4. Create RetrievalQA with ChatGoogleGenerativeAI (gemini-2.5-flash)
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=api_key,
        temperature=0.2
    )

    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=vector_store.as_retriever(search_kwargs={"k": 4})
    )

    # 5. Return Answer
    response = qa_chain.invoke({"query": question})
    return response.get("result", "I could not generate an answer.")
