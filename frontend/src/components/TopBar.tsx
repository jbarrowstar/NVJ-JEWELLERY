import logo from '../assets/logo.png';
import profile from '../assets/profile.jpg';

export default function TopBar({
  setShowConfirm,
}: {
  setShowConfirm: (value: boolean) => void;
}) {
  return (
    <div className="fixed top-0 left-0 right-0 h-16 bg-white shadow px-4 flex items-center justify-between z-50">
      <div className="flex items-center space-x-3">
        <img src={logo} alt="Logo" className="h-10 w-auto" />
        <h1 className="text-xl font-bold text-yellow-600">NIRVAHA</h1>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => setShowConfirm(true)}
          className="bg-red-500 text-white px-3 py-1 rounded"
        >
          Logout
        </button>
        <img src={profile} alt="User" className="h-8 w-8 rounded-full" />
      </div>
    </div>
  );
}
