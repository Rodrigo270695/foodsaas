import { Form, setLayoutProps } from '@inertiajs/react';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { FieldWithIcon } from '@/components/ui/field-with-icon';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from '@/components/ui/input-otp';
import { Spinner } from '@/components/ui/spinner';
import { OTP_MAX_LENGTH } from '@/hooks/use-two-factor-auth';
import { store } from '@/routes/two-factor/login';

export default function TwoFactorForm() {
    const { t } = useTranslation('auth');
    const [showRecovery, setShowRecovery] = useState(false);
    const [code, setCode] = useState('');

    useEffect(() => {
        setLayoutProps({
            editorialKey: showRecovery
                ? 'two_factor_recovery'
                : 'two_factor',
        });
    }, [showRecovery]);

    const toggleLabel = showRecovery
        ? t('two_factor.code_link')
        : t('two_factor.recovery_link');

    const toggleMode = (clearErrors: () => void) => {
        setShowRecovery((prev) => !prev);
        clearErrors();
        setCode('');
    };

    return (
        <Form
            {...store.form()}
            resetOnError
            resetOnSuccess={!showRecovery}
            className="flex flex-col"
        >
            {({ errors, processing, clearErrors }) => (
                <div className="grid gap-6">
                    {showRecovery ? (
                        <div className="grid gap-2">
                            <FieldWithIcon
                                name="recovery_code"
                                type="text"
                                icon={KeyRound}
                                placeholder="xxxxxxxx-xxxxxxxx"
                                autoFocus
                                required
                                autoComplete="one-time-code"
                                className="h-11"
                                aria-invalid={!!errors.recovery_code}
                            />
                            <InputError message={errors.recovery_code} />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-3">
                            <InputOTP
                                name="code"
                                maxLength={OTP_MAX_LENGTH}
                                value={code}
                                onChange={(value) => setCode(value)}
                                disabled={processing}
                                pattern={REGEXP_ONLY_DIGITS}
                                autoFocus
                            >
                                <InputOTPGroup>
                                    {Array.from(
                                        { length: OTP_MAX_LENGTH },
                                        (_, index) => (
                                            <InputOTPSlot
                                                key={index}
                                                index={index}
                                            />
                                        ),
                                    )}
                                </InputOTPGroup>
                            </InputOTP>
                            <InputError message={errors.code} />
                        </div>
                    )}

                    <Button
                        type="submit"
                        size="lg"
                        className="h-11 w-full text-base font-medium"
                        disabled={processing}
                        data-test="two-factor-submit-button"
                    >
                        {processing ? (
                            <Spinner />
                        ) : (
                            <ShieldCheck
                                className="size-4"
                                strokeWidth={2.25}
                            />
                        )}
                        {processing
                            ? t('two_factor_form.verifying')
                            : t('two_factor_form.verify_continue')}
                    </Button>

                    <div className="text-center text-sm text-muted-foreground">
                        <button
                            type="button"
                            className="cursor-pointer rounded-sm text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
                            onClick={() => toggleMode(clearErrors)}
                        >
                            {toggleLabel}
                        </button>
                    </div>
                </div>
            )}
        </Form>
    );
}
