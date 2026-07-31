"use client";
import { useContext } from "react";
import { LanguageContext } from "./LanguageProvider";
export function useAppLanguage() { const value = useContext(LanguageContext); if (!value) throw new Error("useAppLanguage must be used inside LanguageProvider"); return value; }
