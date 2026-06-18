import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const loggedUser = await login(username, password);
      const home =
        loggedUser.role === 'admin'
          ? '/seleccionar'
          : loggedUser.role === 'cartera'
            ? '/cartera'
            : '/';
      navigate(home);
    } catch {
      setError('Credenciales invalidas. Verifica tu cedula y contrasena.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-accent/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <img
            src="/SIGCOM.png"
            alt="SIGCOM"
            className="mb-2 h-24 w-24 object-contain"
          />
          <CardTitle className="text-2xl">SIGCOM</CardTitle>
          <CardDescription>
            Ingresa para tomar pedidos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Cedula</Label>
              <Input
                id="username"
                type="text"
                inputMode="numeric"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Numero de cedula"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contrasena</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Ingresando...' : 'Ingresar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
