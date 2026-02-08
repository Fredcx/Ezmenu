import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar } from 'lucide-react';

export function ReservationsScreen() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-center">
            <button
                onClick={() => navigate('/')}
                className="absolute top-6 left-6 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
            >
                <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-6">
                <Calendar className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-3xl font-black italic tracking-tighter uppercase mb-2">Minhas Reservas</h1>
            <p className="text-white/50 text-center max-w-xs">
                Funcionalidade em desenvolvimento. Em breve você poderá ver todas as suas reservas aqui.
            </p>
        </div>
    );
}
