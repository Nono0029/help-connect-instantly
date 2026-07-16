import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/lib/supabase";

interface UseCameraUploadOptions {
  userId: string;
  folder?: string;
  maxPhotos?: number;
}

export function useCameraUpload({ userId, folder = "demandes", maxPhotos = 5 }: UseCameraUploadOptions) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const uploadFile = async (file: File) => {
    const fileExt = file.name.split(".").pop();
    const filePath = `${folder}/${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
    const { error } = await supabase.storage.from("demande-photos").upload(filePath, file);
    if (error) {
      console.error(error);
      return false;
    }
    const { data: urlData } = supabase.storage.from("demande-photos").getPublicUrl(filePath);
    setPhotos((prev) => [...prev, urlData.publicUrl].slice(0, maxPhotos));
    return true;
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      await uploadFile(file);
    }
    setUploading(false);
    e.target.value = "";
  };

  const openNativePicker = async () => {
    if (!userId) return false;
    try {
      const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Photos,
        width: 800,
        height: 800,
      });
      if (!image.base64String) return false;
      setUploading(true);
      const byteCharacters = atob(image.base64String);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "image/jpeg" });
      const filePath = `${folder}/${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
      const { error } = await supabase.storage.from("demande-photos").upload(filePath, blob);
      if (error) {
        console.error(error);
        setUploading(false);
        return false;
      }
      const { data: urlData } = supabase.storage.from("demande-photos").getPublicUrl(filePath);
      setPhotos((prev) => [...prev, urlData.publicUrl].slice(0, maxPhotos));
      setUploading(false);
      return true;
    } catch (err) {
      console.error("Photo picker error:", err);
      setUploading(false);
      return false;
    }
  };

  const takePhoto = async () => {
    if (!userId) return false;
    try {
      const { Camera: CapCamera, CameraResultType, CameraSource } = await import("@capacitor/camera");
      const isNative = Capacitor.isNativePlatform();
      const source = isNative ? CameraSource.Camera : CameraSource.Prompt;
      const image = await CapCamera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source,
        width: 800,
        height: 800,
      });
      if (!image.base64String) return false;
      setUploading(true);
      const byteCharacters = atob(image.base64String);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "image/jpeg" });
      const filePath = `${folder}/${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
      const { error } = await supabase.storage.from("demande-photos").upload(filePath, blob);
      if (error) {
        console.error(error);
        setUploading(false);
        return false;
      }
      const { data: urlData } = supabase.storage.from("demande-photos").getPublicUrl(filePath);
      setPhotos((prev) => [...prev, urlData.publicUrl].slice(0, maxPhotos));
      setUploading(false);
      return true;
    } catch (err) {
      console.error("Camera error:", err);
      setUploading(false);
      return false;
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const resetPhotos = () => setPhotos([]);

  return { photos, uploading, handleFileInput, takePhoto, openNativePicker, removePhoto, resetPhotos, setPhotos };
}
