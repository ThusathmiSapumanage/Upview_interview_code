"use client";

import { useEffect, useState } from "react";
import { Modal, Upload, Button, message, Avatar, Space } from "antd";
import { UploadOutlined, UserOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";
import { supabase } from "@/lib/supabaseClient";

type Props = { open: boolean; onClose: () => void; onChanged?: (url: string) => void };

const BUCKET = "avatar"; // EXACT bucket name

export default function ProfileAvatar({ open, onClose, onChanged }: Props) {
  const [uploading, setUploading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string | undefined>();

  useEffect(() => {
    (async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) { message.error(error.message); return; }
      if (!user) return;

      setUserId(user.id);

      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (profErr) { console.error(profErr); message.error("Failed to load profile"); }
      else setCurrentUrl(prof?.avatar_url || undefined);
    })();
  }, [open]);

  const props: UploadProps = {
    maxCount: 1,
    accept: "image/png,image/jpeg,image/webp",
    showUploadList: false,
    customRequest: async ({ file, onSuccess, onError }) => {
      if (!userId) { onError?.(new Error("Not signed in")); return; }

      try {
        setUploading(true);
        const f = file as File;
        const ext = f.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${userId}/avatar.${ext}`;

        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, f, {
          cacheControl: "3600",
          upsert: true,
        });
        if (upErr) throw upErr;

        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
        const publicUrl = urlData.publicUrl;

        const { error: dbErr } = await supabase
          .from("profiles")
          .update({ avatar_url: publicUrl })
          .eq("id", userId);
        if (dbErr) throw dbErr;

        setCurrentUrl(publicUrl);
        onChanged?.(publicUrl);
        message.success("Profile photo updated");
        onSuccess?.("ok" as any);
      } catch (e: any) {
        console.error(e);
        message.error(e?.message || "Upload failed");
        onError?.(e);
      } finally {
        setUploading(false);
      }
    },
  };

  return (
    <Modal title="Change profile photo" open={open} onCancel={onClose} footer={null}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Avatar size={96} src={currentUrl} icon={<UserOutlined />} />
        <Upload {...props}>
          <Button icon={<UploadOutlined />} loading={uploading} block>
            {uploading ? "Uploading…" : "Upload image"}
          </Button>
        </Upload>
      </Space>
    </Modal>
  );
}
