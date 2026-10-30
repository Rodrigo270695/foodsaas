import { ImagePlus, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState, type DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ACCEPTED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 2 * 1024 * 1024;

type ProductoImagenUploaderProps = {
    currentUrl: string | null;
    file: File | null;
    pendingRemoval: boolean;
    error?: string;
    disabled?: boolean;
    onSelect: (file: File) => void;
    onClearSelection: () => void;
    onTogglePendingRemoval: () => void;
};

export function ProductoImagenUploader({
    currentUrl,
    file,
    pendingRemoval,
    error,
    disabled = false,
    onSelect,
    onClearSelection,
    onTogglePendingRemoval,
}: ProductoImagenUploaderProps) {
    const { t } = useTranslation(['carta', 'common']);
    const inputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!file) {
            setPreviewUrl(null);

            return;
        }

        const url = URL.createObjectURL(file);
        setPreviewUrl(url);

        return () => URL.revokeObjectURL(url);
    }, [file]);

    const displayUrl = pendingRemoval
        ? null
        : (previewUrl ?? currentUrl ?? null);

    const handleFiles = (files: FileList | null) => {
        setLocalError(null);
        if (!files || files.length === 0) {
            return;
        }

        const candidate = files[0];
        if (!ACCEPTED_MIME.includes(candidate.type)) {
            setLocalError(t('producto_form.fields.imagen_hint'));

            return;
        }
        if (candidate.size > MAX_BYTES) {
            setLocalError(t('producto_form.fields.imagen_hint'));

            return;
        }

        onSelect(candidate);
    };

    return (
        <div className="flex flex-col gap-2 sm:col-span-2">
            <label
                onDragOver={(e) => {
                    e.preventDefault();
                    if (!disabled) {
                        setIsDragging(true);
                    }
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e: DragEvent<HTMLLabelElement>) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (!disabled) {
                        handleFiles(e.dataTransfer.files);
                    }
                }}
                className={cn(
                    'relative flex min-h-[8.5rem] cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-dashed bg-muted/20 p-4 transition-all duration-300',
                    isDragging && 'scale-[1.01] border-brand-500 bg-brand-50/40 blur-[0.2px]',
                    disabled && 'cursor-not-allowed opacity-60',
                    !disabled && 'hover:border-brand-400/60 hover:bg-brand-50/20',
                )}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept={ACCEPTED_MIME.join(',')}
                    className="sr-only"
                    disabled={disabled}
                    onChange={(e) => handleFiles(e.target.files)}
                />

                {displayUrl ? (
                    <img
                        src={displayUrl}
                        alt=""
                        className="absolute inset-0 size-full object-cover transition-opacity duration-500"
                    />
                ) : (
                    <>
                        <span className="flex size-10 items-center justify-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-200">
                            <ImagePlus className="size-5" strokeWidth={2.25} />
                        </span>
                        <span className="text-sm font-medium text-foreground">
                            {t('producto_form.fields.imagen_drop')}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            {t('producto_form.fields.imagen_hint')}
                        </span>
                    </>
                )}

                {displayUrl ? (
                    <span className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                ) : null}
            </label>

            <div className="flex flex-wrap gap-2">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={disabled}
                    onClick={() => inputRef.current?.click()}
                    className="cursor-pointer gap-1.5"
                >
                    <Upload className="size-3.5" />
                    {t('producto_form.fields.imagen_pick')}
                </Button>
                {(file || currentUrl) && !pendingRemoval ? (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={disabled}
                        onClick={() => {
                            if (file) {
                                onClearSelection();
                            } else {
                                onTogglePendingRemoval();
                            }
                        }}
                        className="cursor-pointer gap-1.5 text-destructive hover:text-destructive"
                    >
                        <X className="size-3.5" />
                        {t('common:actions.remove')}
                    </Button>
                ) : null}
                {pendingRemoval ? (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={disabled}
                        onClick={onTogglePendingRemoval}
                        className="cursor-pointer"
                    >
                        {t('common:actions.undo')}
                    </Button>
                ) : null}
            </div>

            {(localError || error) && (
                <p className="text-xs text-destructive" role="alert">
                    {localError ?? error}
                </p>
            )}
        </div>
    );
}
