import { getFunctions, httpsCallable } from "firebase/functions";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";

/**
 * lädt ein foto über die firebase cloud function zu R2 hoch
 */
export async function uploadPhotoToR2(localUri, fileName) {
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const contentType = fileName.toLowerCase().endsWith(".png")
    ? "image/png"
    : "image/jpeg";

  const functions = getFunctions();
  const uploadPhoto = httpsCallable(functions, "uploadPhoto");

  const result = await uploadPhoto({
    fileName,
    fileBase64: base64,
    contentType,
  });

  return result.data.url;
}

/**
 * öffnet die galerie, lässt den user ein foto wählen und lädt es direkt hoch
 */
export async function pickAndUploadPhoto() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("zugriff auf fotos wurde nicht erlaubt");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
  });

  if (result.canceled) return null;

  const asset = result.assets[0];
  const fileName = asset.uri.split("/").pop();

  const publicUrl = await uploadPhotoToR2(asset.uri, fileName);
  return publicUrl;
}