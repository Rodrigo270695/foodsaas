import {
    Form,
    Head,
    resetLayoutProps,
    setLayoutProps,
    usePage,
} from '@inertiajs/react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDemoMutationsLocked } from '@/hooks/use-demo-mutations-locked';
import { edit } from '@/routes/profile';
import type { Auth } from '@/types';

type PageProps = {
    auth: Auth;
};

export default function Profile({
    mustVerifyEmail: _mustVerifyEmail,
    status: _status,
}: {
    mustVerifyEmail?: boolean;
    status?: string;
}) {
    const { t } = useTranslation(['settings', 'common']);
    const demoLocked = useDemoMutationsLocked();
    const { auth } = usePage<PageProps>().props;
    const user = auth.user;

    useEffect(() => {
        setLayoutProps({
            breadcrumbs: [
                {
                    title: t('settings:profile.title'),
                    href: edit(),
                },
            ],
        });

        return () => {
            resetLayoutProps();
        };
    }, [t]);

    if (!user) {
        return null;
    }

    return (
        <>
            <Head title={t('settings:profile.title')} />

            <h1 className="sr-only">{t('settings:profile.title')}</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title={t('settings:profile.section_title')}
                    description={t('settings:profile.section_description')}
                />

                <Form
                    {...ProfileController.update.form()}
                    options={{
                        preserveScroll: true,
                    }}
                    className="space-y-6"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="name">
                                    {t('settings:profile.name')}
                                </Label>

                                <Input
                                    id="name"
                                    className="mt-1 block w-full"
                                    defaultValue={user.name}
                                    name="name"
                                    required
                                    autoComplete="name"
                                    disabled={demoLocked}
                                    readOnly={demoLocked}
                                    placeholder={t(
                                        'settings:profile.name_placeholder',
                                    )}
                                />

                                <InputError
                                    className="mt-2"
                                    message={errors.name}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="email">
                                    {t('settings:profile.email')}
                                </Label>

                                <Input
                                    id="email"
                                    type="email"
                                    className="mt-1 block w-full"
                                    defaultValue={user.email}
                                    name="email"
                                    required
                                    autoComplete="username"
                                    disabled={demoLocked}
                                    readOnly={demoLocked}
                                    placeholder={t(
                                        'settings:profile.email_placeholder',
                                    )}
                                />

                                <InputError
                                    className="mt-2"
                                    message={errors.email}
                                />
                            </div>

                            <div className="flex items-center gap-4">
                                <Button
                                    disabled={processing || demoLocked}
                                    data-test="update-profile-button"
                                >
                                    {t('common:actions.save')}
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}
