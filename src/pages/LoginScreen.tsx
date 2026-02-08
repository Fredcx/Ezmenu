import { useNavigate } from 'react-router-dom';
import { AccessScreen } from '@/components/AccessScreen';

export function LoginScreen() {
    const navigate = useNavigate();

    const handleAccessGranted = (name: string, email: string) => {
        console.log('Global Login Success:', name, email);
        localStorage.setItem('ez_menu_access', 'granted');
        localStorage.setItem('ez_menu_access_time', Date.now().toString());
        // Redirect back to Discovery (root) after successful login
        navigate('/');
    };

    return <AccessScreen onAccessGranted={handleAccessGranted} />;
}
