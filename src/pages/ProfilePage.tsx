import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Profile } from '../lib/supabase';
import { User, LogOut, Edit2, Save } from 'lucide-react';

type ProfilePageProps = {
  onNavigate: (page: string) => void;
};

export default function ProfilePage({ onNavigate }: ProfilePageProps) {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [skinType, setSkinType] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (data) {
      setProfile(data);
      setFullName(data.full_name);
      setSkinType(data.skin_type);
    }

    setLoading(false);
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, skin_type: skinType, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (!error) {
      setProfile({ ...profile!, full_name: fullName, skin_type: skinType });
      setIsEditing(false);
    }

    setSaving(false);
  };

  const handleSignOut = async () => {
    await signOut();
    onNavigate('home');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-rose-500 to-pink-500 px-8 py-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-4">
              <User className="w-10 h-10 text-rose-600" />
            </div>
            <h1 className="text-2xl font-light text-white mb-2">
              {profile?.full_name || 'Your Profile'}
            </h1>
            <p className="text-rose-100">{user?.email}</p>
          </div>

          <div className="px-8 py-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-medium text-gray-900">Profile Information</h2>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center space-x-2 text-rose-600 hover:text-rose-700"
                >
                  <Edit2 className="w-4 h-4" />
                  <span className="text-sm font-medium">Edit</span>
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center space-x-2 text-green-600 hover:text-green-700 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span className="text-sm font-medium">{saving ? 'Saving...' : 'Save'}</span>
                </button>
              )}
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                  />
                ) : (
                  <p className="text-gray-900 px-4 py-3 bg-gray-50 rounded-lg">
                    {profile?.full_name || 'Not set'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Skin Type
                </label>
                {isEditing ? (
                  <select
                    value={skinType}
                    onChange={(e) => setSkinType(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                  >
                    <option value="">Select your skin type</option>
                    <option value="normal">Normal</option>
                    <option value="dry">Dry</option>
                    <option value="oily">Oily</option>
                    <option value="combination">Combination</option>
                    <option value="sensitive">Sensitive</option>
                  </select>
                ) : (
                  <p className="text-gray-900 px-4 py-3 bg-gray-50 rounded-lg capitalize">
                    {profile?.skin_type || 'Not set'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <p className="text-gray-900 px-4 py-3 bg-gray-50 rounded-lg">
                  {user?.email}
                </p>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t">
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-2 text-red-600 hover:text-red-700 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-3xl shadow-lg p-8">
          <h2 className="text-xl font-medium text-gray-900 mb-6">Order History</h2>
          <div className="text-center py-12">
            <p className="text-gray-600">No orders yet</p>
            <button
              onClick={() => onNavigate('home')}
              className="mt-4 text-rose-600 hover:text-rose-700 font-medium"
            >
              Start Shopping
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
