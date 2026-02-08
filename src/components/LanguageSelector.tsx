
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { ChevronDown } from "lucide-react";

export function LanguageSelector() {
    const { language, setLanguage } = useLanguage();

    const flags = {
        pt: (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 480" className="w-6 h-4 mr-2">
                <rect width="720" height="480" fill="#009c3b" />
                <path fill="#ffdf00" d="M360 81.2L626.5 240 360 398.8 93.5 240z" />
                <circle cx="360" cy="240" r="84" fill="#002776" />
                <path fill="#fff" d="M260.4 252.6s2.5-12.2 20.6-17.7c18.1-5.6 52.6-6.4 78 8.8 25.3 15.2 27.2 24.3 27.2 24.3" />
            </svg>
        ),
        en: (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 741 390" className="w-6 h-4 mr-2">
                <rect width="741" height="390" fill="#b22234" />
                <path d="M0,32h741v26h-741M0,84h741v26h-741M0,136h741v26h-741M0,188h741v26h-741M0,240h741v26h-741M0,292h741v26h-741M0,344h741v26h-741" stroke="#fff" strokeWidth="26" />
                <rect width="296.4" height="208" fill="#3c3b6e" />
                <g fill="#fff">
                    <g id="s18">
                        <g id="s9">
                            <g id="s5">
                                <g id="s4">
                                    <path id="s" d="M24.7,5.7l10,29.8h-31.3l25.3-17.9l-10.2,30.3l-9.5-30.8l25.6,18.4" />
                                    <use xlinkHref="#s" y="42" />
                                    <use xlinkHref="#s" y="84" />
                                    <use xlinkHref="#s" y="126" />
                                </g>
                                <use xlinkHref="#s" y="168" />
                            </g>
                            <use xlinkHref="#s4" x="24.7" />
                            <use xlinkHref="#s4" x="49.4" />
                        </g>
                        <use xlinkHref="#s9" x="74.1" />
                        <use xlinkHref="#s9" x="148.2" />
                        <use xlinkHref="#s4" x="222.3" />
                    </g>
                    <use xlinkHref="#s18" x="12.35" y="21" />
                    <use xlinkHref="#s9" x="234.65" y="21" />
                </g>
            </svg>
        ),
        es: (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 500" className="w-6 h-4 mr-2">
                <rect width="750" height="500" fill="#c60b1e" />
                <rect width="750" height="250" y="125" fill="#ffc400" />
            </svg>
        ),
    };

    const labels = {
        pt: 'PT',
        en: 'EN',
        es: 'ES',
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 gap-1">
                    {flags[language]}
                    <span className="text-sm font-medium">{labels[language]}</span>
                    <ChevronDown className="w-4 h-4 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setLanguage('pt')}>
                    {flags.pt}
                    <span>Português</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage('en')}>
                    {flags.en}
                    <span>English</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage('es')}>
                    {flags.es}
                    <span>Español</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
