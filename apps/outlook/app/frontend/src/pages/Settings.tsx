
import { useParams } from '@/lib/next-compat'
import { SettingsSidebar } from '@/components/settings/SettingsSidebar'
import { SignatureSettings } from '@/components/settings/SignatureSettings'
import { RuleSettings } from '@/components/settings/RuleSettings'
import { OOFSettings } from '@/components/settings/OOFSettings'
import { CategorySettings } from '@/components/settings/CategorySettings'
import { GeneralSettings } from '@/components/settings/GeneralSettings'
import { MailSettings } from '@/components/settings/MailSettings'
import { QuickStepSettings } from '@/components/settings/QuickStepSettings'
import { DelegateSettings } from '@/components/settings/DelegateSettings'

export function Settings() {
  const params = useParams()
  const section = (params?.section as string[] | undefined)?.[0] ?? 'general'

  const renderSection = () => {
    switch (section) {
      case 'signatures':
        return <SignatureSettings />
      case 'rules':
        return <RuleSettings />
      case 'oof':
        return <OOFSettings />
      case 'categories':
        return <CategorySettings />
      case 'mail':
        return <MailSettings />
      case 'quick-steps':
        return <QuickStepSettings />
      case 'delegates':
        return <DelegateSettings />
      case 'general':
      default:
        return <GeneralSettings />
    }
  }

  return (
    <div className="h-full flex overflow-hidden">
      <SettingsSidebar />
      <main className="flex-1 overflow-y-auto outlook-scrollbar bg-white" aria-label="Settings panel">
        {renderSection()}
      </main>
    </div>
  )
}
