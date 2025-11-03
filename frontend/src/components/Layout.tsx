import { useState, useEffect } from 'react';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const storedRole = localStorage.getItem('userRole');
    if (!storedRole) {
      toast.error('Session expired. Please log in again.');
      navigate('/');
    } else {
      setRole(storedRole);
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    toast.success('Logout successful!');
    setTimeout(() => navigate('/'), 1500);
  };

  const marginLeft = sidebarOpen ? 'ml-64' : 'ml-16';

  return (
    <div className="min-h-screen bg-gray-100 font-garamond">
      <TopBar setShowConfirm={setShowConfirm} />
      {role && (
        <Sidebar
          isOpen={sidebarOpen}
          toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
      )}

      <main className={`p-6 pt-20 transition-all duration-300 ${marginLeft}`}>
        {children}
      </main>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-400 bg-opacity-20">
          <div className="bg-white rounded shadow-lg p-6 w-full max-w-sm text-center">
            <h2 className="text-lg font-semibold mb-4">
              Are you sure you want to log out for the day?
            </h2>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConfirm(false);
                  handleLogout();
                }}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
