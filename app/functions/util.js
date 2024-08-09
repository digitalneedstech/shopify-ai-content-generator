import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import axios from "axios";

export async function getImageBase64Encoded(imageUrl){
    const axiosRes = await axios.get(imageUrl, { responseType: "arraybuffer" });
    const base64 = btoa(
      new Uint8Array(axiosRes.data).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        "",
      ),
    );
    return base64;
}

export function initializeGenerativeAIInstance(type){
    return new ChatGoogleGenerativeAI({
        model: "gemini-1.5-flash-001",
        maxOutputTokens: 2048,
        apiKey: "AIzaSyAqP1tbsekrAoZjSM02OiefzPw_nMzPs9I"
        
      });
}