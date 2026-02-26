import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Eye, EyeOff, Save, Trash2, Plus } from 'lucide-react';

interface LocationApiKey {
  id: string;
  location_id: string;
  api_key: string;
}

export default function LocationSettings() {
  const [entries, setEntries] = useState<LocationApiKey[]>([]);
  const [newLocationId, setNewLocationId] = useState('');
  const [newApiKey, setNewApiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  const fetchEntries = async () => {
    const { data, error } = await supabase
      .from('location_api_keys')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setEntries(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchEntries(); }, []);

  const handleAdd = async () => {
    if (!newLocationId.trim() || !newApiKey.trim()) {
      toast({ title: 'Missing fields', description: 'Both Location ID and API Key are required.', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('location_api_keys').upsert(
      { location_id: newLocationId.trim(), api_key: newApiKey.trim() },
      { onConflict: 'location_id' }
    );
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Saved', description: `API key for ${newLocationId} saved.` });
      setNewLocationId('');
      setNewApiKey('');
      fetchEntries();
    }
  };

  const handleDelete = async (id: string, locationId: string) => {
    const { error } = await supabase.from('location_api_keys').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Deleted', description: `API key for ${locationId} removed.` });
      fetchEntries();
    }
  };

  const toggleVisibility = (id: string) => {
    setVisibleKeys(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const maskKey = (key: string) => key.slice(0, 8) + '••••••••' + key.slice(-4);

  return (
    <div className="min-h-screen bg-background p-8 max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Location API Keys</CardTitle>
          <CardDescription>Assign API keys per location ID for external integrations.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add new */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Location ID"
              value={newLocationId}
              onChange={e => setNewLocationId(e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="API Key"
              type="password"
              value={newApiKey}
              onChange={e => setNewApiKey(e.target.value)}
              className="flex-[2]"
            />
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>

          {/* List */}
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading...</p>
          ) : entries.length === 0 ? (
            <p className="text-muted-foreground text-sm">No API keys configured yet.</p>
          ) : (
            <div className="space-y-3">
              {entries.map(entry => (
                <div key={entry.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                  <span className="font-mono text-sm font-medium min-w-[120px]">{entry.location_id}</span>
                  <span className="font-mono text-xs text-muted-foreground flex-1 truncate">
                    {visibleKeys.has(entry.id) ? entry.api_key : maskKey(entry.api_key)}
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => toggleVisibility(entry.id)}>
                    {visibleKeys.has(entry.id) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(entry.id, entry.location_id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
