import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
  const { lang, setLang } = useI18n();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full">
          <Globe className="h-4 w-4" />
          <span className="sr-only">Toggle language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setLang('es')} className={lang === 'es' ? 'bg-accent/20' : ''}>
          Español (ES)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLang('en')} className={lang === 'en' ? 'bg-accent/20' : ''}>
          English (EN)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLang('ru')} className={lang === 'ru' ? 'bg-accent/20' : ''}>
          Русский (RU)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
