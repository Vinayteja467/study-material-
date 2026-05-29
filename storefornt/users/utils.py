import os
from PyPDF2 import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
# from langchain.vectorstores import FAISS
from langchain_community.vectorstores import FAISS

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_classic.chains.question_answering import load_qa_chain
from langchain_classic.prompts import PromptTemplate
from dotenv import load_dotenv
load_dotenv()

def get_pdf_text(pdf_docs):
    text = ""
    pdf_reader = PdfReader(pdf_docs)
    for page in pdf_reader.pages:
        text += page.extract_text()
    return text

def get_text_chunks(text):
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=10000, chunk_overlap=1000)
    chunks = text_splitter.split_text(text)
    return chunks

def get_vector_store(text_chunks, pdf_id):
    embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
    vector_store = FAISS.from_texts(text_chunks, embedding=embeddings)
    vector_store.save_local(f"faiss_index_{pdf_id}")

def get_conversational_chain(marks):
    if str(marks) == '2':
        detail_level = "Provide a brief, concise answer strictly 50 words."
    else:
        detail_level = "Provide a detailed answer, strictly above 1000 words, if required eloborate the answer."

    prompt_template = f"""
    Answer the question as detailed as possible. Ensure to provide all 
    relevant details, and if the answer is not available in the context, mention that it's unavailable. Avoid
    providing incorrect information.\n
    {detail_level}\n
    Context:\n {{context}}\n
    Question:\n {{question}}\n
    Answer:
    """
    model = ChatGoogleGenerativeAI(model="gemini-1.5-flash", temperature=0.6)
    prompt = PromptTemplate(template=prompt_template, input_variables=["context", "question"])
    chain = load_qa_chain(model, chain_type="stuff", prompt=prompt)
    return chain


def user_input(user_question, marks, pdf_id):
    embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
    new_db = FAISS.load_local(f"faiss_index_{pdf_id}", embeddings, allow_dangerous_deserialization=True)
    docs = new_db.similarity_search(user_question)
    chain = get_conversational_chain(marks)
    response = chain({"input_documents": docs, "question": user_question}, return_only_outputs=True)
    # print(response)
    return response["output_text"]