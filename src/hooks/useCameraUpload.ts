import { useState, useRef, useCallback, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/lib/supabase";

interface UseCameraUploadOptions {
  userId: string;
  folder?: string;
  maxPhotos?: number;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Upload timeout after ${ms}ms`)), ms)
    ),
  ]);
}

export function useCameraUpload({ userId, folder = "demandes", maxPhotos = 5 }: UseCameraUploadOptions) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const mountedRef = useRef(true);
  const busyRef = useRef(false);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    if (!userId) return false;
    const fileExt = file.name.split(".").pop();
    const filePath = `${folder}/${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
    const { error } = await withTimeout(
      supabase.storage.from("demande-photos").upload(filePath, file),
      15000
    );
    if (error) {
      console.error("Upload error:", error);
      return false;
    }
    const { data: urlData } = supabase.storage.from("demande-photos").getPublicUrl(filePath);
    if (mountedRef.current) {
      setPhotos((prev) => [...prev, urlData.publicUrl].slice(0, maxPhotos));
    }
    return true;
  }, [userId, folder, maxPhotos]);

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (busyRef.current) { e.target.value = ""; return; }
    busyRef.current = true;
    if (mountedRef.current) setUploading(true);
    for (const file of Array.from(files)) {
      await uploadFile(file);
    }
    busyRef.current = false;
    if (mountedRef.current) setUploading(false);
    e.target.value = "";
  }, [uploadFile]);

  const openNativePicker = useCallback(async () => {
    if (!userId || busyRef.current) return false;
    busyRef.current = true;
    if (mountedRef.current) setUploading(true);
    try {
      const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
      const image = await Camera.getPhoto({
        quality: 50,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Photos,
        width: 600,
        height: 600,
      });
      if (!image.base64String) {
        busyRef.current = false;
        if (mountedRef.current) setUploading(false);
        return false;
      }
      const byteCharacters = atob(image.base64String);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "image/jpeg" });
      const filePath = `${folder}/${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
      const { error } = await withTimeout(
        supabase.storage.from("demande-photos").upload(filePath, blob),
        15000
      );
      if (error) {
        console.error("Photo upload error:", error);
        busyRef.current = false;
        if (mountedRef.current) setUploading(false);
        return false;
      }
      const { data: urlData } = supabase.storage.from("demande-photos").getPublicUrl(filePath);
      if (mountedRef.current) {
        setPhotos((prev) => [...prev, urlData.publicUrl].slice(0, maxPhotos));
      }
      busyRef.current = false;
      if (mountedRef.current) setUploading(false);
      return true;
    } catch (err) {
      console.error("Photo picker error:", err);
      busyRef.current = false;
      if (mountedRef.current) setUploading(false);
      return false;
    }
  }, [userId, folder, maxPhotos]);

  const takePhoto = useCallback(async () => {
    if (!userId || busyRef.current) return false;
    busyRef.current = true;
    if (mountedRef.current) setUploading(true);
    try {
      const { Camera: CapCamera, CameraResultType, CameraSource } = await import("@capacitor/camera");
      const isNative = Capacitor.isNativePlatform();
      const source = isNative ? CameraSource.Camera : CameraSource.Prompt;
      const image = await CapCamera.getPhoto({
        quality: 50,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source,
        width: 600,
        height: 600,
      });
      if (!image.base64String) {
        busyRef.current = false;
        if (mountedRef.current) setUploading(false);
        return false;
      }
      const byteCharacters = atob(image.base64String);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "image/jpeg" });
      const filePath = `${folder}/${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
      const { error } = await withTimeout(
        supabase.storage.from("demande-photos").upload(filePath, blob),
        15000
      );
      if (error) {
        console.error("Camera upload error:", error);
        busyRef.current = false;
        if (mountedRef.current) setUploading(false);
        return false;
      }
      const { data: urlData } = supabase.storage.from("demande-photos").getPublicUrl(filePath);
      if (mountedRef.current) {
        setPhotos((prev) => [...prev, urlData.publicUrl].slice(0, maxPhotos));
      }
      busyRef.current = false;
      if (mountedRef.current) setUploading(false);
      return true;
    } catch (err) {
      console.error("Camera error:", err);
      busyRef.current = false;
      if (mountedRef.current) setUploading(false);
      return false;
    }
  }, [userId, folder, maxPhotos]);

  const removePhoto = useCallback((index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const resetPhotos = useCallback(() => setPhotos([]), []);

  const resetBusy = useCallback(() => {
    busyRef.current = false;
    if (mountedRef.current) setUploading(false);
  }, []);

  return { photos, uploading, handleFileInput, takePhoto, openNativePicker, removePhoto, resetPhotos, setPhotos, resetBusy };
}
