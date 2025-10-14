import React, { useCallback, useRef } from "react";
import { useSetAtom } from "jotai";
import { originalImageAtom } from "../state/atoms";
import AeButton from "@/components/AeButton";

export default function ImageUploader() {
  const setOriginal = useSetAtom(originalImageAtom);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const onFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result);
      // create an Image to read dimensions for preview/layout
      const img = new Image();
      img.onload = () => {
        setOriginal({ src, width: img.width, height: img.height, type: file.type, file });
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }, [setOriginal]);

  return (
    <div className="flex items-center gap-3">
      <input ref={inputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
      <AeButton onClick={() => inputRef.current?.click()}>Select Image</AeButton>
      <AeButton variant="secondary" onClick={() => setOriginal({ src: null, width: 0, height: 0, type: null, file: null })}>Reset</AeButton>
    </div>
  );
}


