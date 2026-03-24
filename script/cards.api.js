/* =========================
   CARDS API / IMAGE
========================= */

const API = {
  async fetchCards() {
    const { data, error } = await supabaseClient
      .from("cards")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("fetchCards error:", error);
      return [];
    }

    return data || [];
  },

  async insertCard(card) {
    const { data, error } = await supabaseClient
      .from("cards")
      .insert(card)
      .select();

    if (error) {
      console.error("insertCard error:", error);
      throw error;
    }

    return data?.[0] || null;
  },

  async updateCard(id, updates) {
    const { error } = await supabaseClient
      .from("cards")
      .update(updates)
      .eq("id", id);

    if (error) {
      console.error("updateCard error:", error);
      throw error;
    }
  },

  async deleteCard(id) {
    const { error } = await supabaseClient
      .from("cards")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("deleteCard error:", error);
      throw error;
    }
  },

  async uploadPhoto(file) {
    const compressedBlob = await compressImageToSquare(file, 512, 0.85);
    const fileName = `${Date.now()}.jpg`;

    const { error: uploadError } = await supabaseClient
      .storage
      .from("photos")
      .upload(fileName, compressedBlob, {
        contentType: "image/jpeg",
        upsert: false
      });

    if (uploadError) {
      console.error("uploadPhoto error:", uploadError);
      throw uploadError;
    }

    const { data } = supabaseClient
      .storage
      .from("photos")
      .getPublicUrl(fileName);

    return data.publicUrl;
  }
};

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;

    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => resolve(img);
    img.onerror = reject;

    img.src = src;
  });
}

async function compressImageToSquare(file, size = 512, quality = 0.85) {
  const dataUrl = await readFileAsDataURL(file);
  const img = await loadImage(dataUrl);

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");

  const scale = Math.max(size / img.width, size / img.height);
  const drawWidth = img.width * scale;
  const drawHeight = img.height * scale;
  const dx = (size - drawWidth) / 2;
  const dy = (size - drawHeight) / 2;

  ctx.drawImage(img, dx, dy, drawWidth, drawHeight);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Не удалось сжать изображение"));
        return;
      }
      resolve(blob);
    }, "image/jpeg", quality);
  });
}
