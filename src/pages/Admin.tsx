import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useTracks, useDeleteTrack, useUpdateTrack } from '@/hooks/useTracks';
import { useLabelImages, useUploadLabelImage, useSetActiveLabelImage, useDeleteLabelImage } from '@/hooks/useLabelImages';
import { Pencil, Trash2, LogOut, Plus, FolderUp, Upload, Image as ImageIcon, Check, Key, Lock, AlertTriangle, Copy } from 'lucide-react';
import { extractMp3Metadata } from '@/utils/mp3Metadata';
import { checkStorageBuckets, STORAGE_BUCKETS_MIGRATION, type StorageBucketsHealth } from '@/utils/backendHealth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

export default function Admin() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const { data: role, isLoading: roleLoading } = useUserRole(user?.id);
  const { data: tracks, isLoading: tracksLoading } = useTracks();
  const deleteTrack = useDeleteTrack();
  const updateTrack = useUpdateTrack();
  
  const { data: labelImages, isLoading: labelsLoading } = useLabelImages();
  const uploadLabelImage = useUploadLabelImage();
  const setActiveLabelImage = useSetActiveLabelImage();
  const deleteLabelImage = useDeleteLabelImage();

  // Login state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<any>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editArtist, setEditArtist] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newArtist, setNewArtist] = useState('');
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const folderInputRef = useRef<HTMLInputElement>(null);
  const multipleFilesInputRef = useRef<HTMLInputElement>(null);
  
  const [labelUploadDialogOpen, setLabelUploadDialogOpen] = useState(false);
  const [labelDeleteDialogOpen, setLabelDeleteDialogOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<any>(null);
  const [uploadingLabel, setUploadingLabel] = useState<File | null>(null);
  const [uploadingLabelImage, setUploadingLabelImage] = useState(false);
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  
  // Backend health check state
  const [storageHealth, setStorageHealth] = useState<StorageBucketsHealth | null>(null);
  const [healthCheckComplete, setHealthCheckComplete] = useState(false);
  const [showMigrationSQL, setShowMigrationSQL] = useState(false);

  const needsPasswordChange = user?.user_metadata?.needs_password_change === true;

  useEffect(() => {
    if (!authLoading && user && !roleLoading && role !== 'admin') {
      toast({
        title: 'Access denied',
        description: 'You must be an admin to access this page.',
        variant: 'destructive',
      });
      navigate('/');
    }
  }, [user, role, roleLoading, authLoading, navigate]);

  useEffect(() => {
    // Check if any admin exists in the system
    const checkAdminExists = async () => {
      if (!authLoading && !user) {
        const { data } = await supabase
          .from('user_roles')
          .select('*')
          .eq('role', 'admin')
          .maybeSingle();

        if (!data) {
          // No admin exists, redirect to setup
          navigate('/setup');
        }
      }
    };

    checkAdminExists();
  }, [user, authLoading, navigate]);

  // Check storage bucket health when admin page loads
  useEffect(() => {
    const performHealthCheck = async () => {
      if (user && role === 'admin' && !healthCheckComplete) {
        console.log('Performing backend storage health check...');
        const health = await checkStorageBuckets();
        console.log('Storage health check results:', health);
        setStorageHealth(health);
        setHealthCheckComplete(true);
        
        if (!health.allHealthy) {
          console.error('Storage buckets missing:', {
            tracks: !health.tracks.exists,
            labelImages: !health.labelImages.exists,
          });
        }
      }
    };

    performHealthCheck();
  }, [user, role, healthCheckComplete]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    try {
      const email = username === 'admin' ? 'admin@admin.com' : `${username}@admin.com`;
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast({ title: data.user?.user_metadata?.needs_password_change ? 'Password Change Required' : 'Welcome back!' });
    } catch (error: any) {
      toast({ title: 'Login failed', description: error.message, variant: 'destructive' });
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: 'Password too short', variant: 'destructive' });
      return;
    }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword, data: { needs_password_change: false } });
      if (error) throw error;
      toast({ title: 'Password changed successfully' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast({ title: 'Password change failed', description: error.message, variant: 'destructive' });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDelete = async () => {
    if (selectedTrack) {
      await deleteTrack.mutateAsync(selectedTrack.dbId);
      setDeleteDialogOpen(false);
      setSelectedTrack(null);
    }
  };

  const handleEdit = async () => {
    if (selectedTrack) {
      await updateTrack.mutateAsync({
        id: selectedTrack.dbId,
        title: editTitle,
        artist: editArtist,
      });
      setEditDialogOpen(false);
      setSelectedTrack(null);
    }
  };

  const handleAddTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadingFile || !newTitle || !newArtist) return;

    // Check if storage buckets exist before attempting upload
    if (storageHealth && !storageHealth.tracks.exists) {
      toast({
        title: 'Backend Setup Required',
        description: 'The tracks storage bucket does not exist. See the warning banner above for setup instructions.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file extension
    if (!uploadingFile.name.toLowerCase().endsWith('.mp3')) {
      toast({
        title: 'Invalid file',
        description: 'Please upload an MP3 file',
        variant: 'destructive',
      });
      return;
    }

    // Validate MIME type (server-side protection)
    if (uploadingFile.type !== 'audio/mpeg' && uploadingFile.type !== 'audio/mp3') {
      toast({
        title: 'Invalid file type',
        description: 'Only MP3 audio files are allowed',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (50MB limit)
    if (uploadingFile.size > 50 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'File size must be less than 50MB',
        variant: 'destructive',
      });
      return;
    }

    // Validate file is not empty
    if (uploadingFile.size === 0) {
      toast({
        title: 'Invalid file',
        description: 'File is empty',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      // Upload file to storage
      const fileExt = uploadingFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('tracks')
        .upload(fileName, uploadingFile);

      if (uploadError) {
        console.error('Track upload error:', uploadError);
        
        // Detect specific error types
        if (uploadError.message?.toLowerCase().includes('bucket') && 
            uploadError.message?.toLowerCase().includes('not found')) {
          throw new Error('The tracks storage bucket does not exist in this project. See the warning banner above for setup instructions.');
        }
        
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('tracks')
        .getPublicUrl(fileName);

      // Insert track record
      const { error: insertError } = await supabase
        .from('tracks')
        .insert({
          title: newTitle,
          artist: newArtist,
          audio_url: publicUrl,
          user_id: user?.id,
          order_index: (tracks?.length || 0) + 1,
        });

      if (insertError) throw insertError;

      await queryClient.invalidateQueries({ queryKey: ['tracks'] });
      toast({ title: 'Track added successfully!' });
      setAddDialogOpen(false);
      setNewTitle('');
      setNewArtist('');
      setUploadingFile(null);
    } catch (error: any) {
      toast({
        title: 'Error adding track',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleBulkUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    console.log('Bulk upload triggered, files:', files.length);

    // Check if storage buckets exist before attempting upload
    if (storageHealth && !storageHealth.tracks.exists) {
      toast({
        title: 'Backend Setup Required',
        description: 'The tracks storage bucket does not exist. See the warning banner above for setup instructions.',
        variant: 'destructive',
      });
      return;
    }

    // Filter and validate files with comprehensive checks
    const mp3Files = Array.from(files).filter((file) => {
      const isValidExtension = file.name.toLowerCase().endsWith('.mp3');
      const isValidMimeType = file.type === 'audio/mpeg' || file.type === 'audio/mp3';
      const isValidSize = file.size > 0 && file.size <= 50 * 1024 * 1024;
      return isValidExtension && isValidMimeType && isValidSize;
    });

    if (mp3Files.length === 0) {
      toast({
        title: 'No valid files',
        description: 'No valid MP3 files found. Files must be audio/mpeg format and under 50MB.',
        variant: 'destructive',
      });
      return;
    }

    // Warn if some files were filtered out
    const rejectedCount = files.length - mp3Files.length;
    if (rejectedCount > 0) {
      toast({
        title: 'Some files rejected',
        description: `${rejectedCount} file(s) rejected due to invalid format, type, or size`,
        variant: 'default',
      });
    }

    setIsUploading(true);
    setUploadProgress({ current: 0, total: mp3Files.length });

    // Sort files alphabetically
    mp3Files.sort((a, b) => a.name.localeCompare(b.name));

    // Get current max order_index
    const { data: existingTracks } = await supabase
      .from('tracks')
      .select('order_index')
      .order('order_index', { ascending: false })
      .limit(1);

    let nextOrderIndex = existingTracks && existingTracks.length > 0 
      ? existingTracks[0].order_index + 1 
      : 0;

    const failedFiles: string[] = [];
    let successCount = 0;

    for (let i = 0; i < mp3Files.length; i++) {
      const file = mp3Files[i];
      setUploadProgress({ current: i + 1, total: mp3Files.length });

      try {
        // Extract metadata
        const metadata = await extractMp3Metadata(file);

        // Upload file to storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('tracks')
          .upload(fileName, file);

        if (uploadError) {
          console.error(`Track upload error for ${file.name}:`, uploadError);
          
          // Detect specific error types
          if (uploadError.message?.toLowerCase().includes('bucket') && 
              uploadError.message?.toLowerCase().includes('not found')) {
            throw new Error('Storage bucket not found');
          }
          
          throw uploadError;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('tracks')
          .getPublicUrl(fileName);

        // Insert into database
        const { error: insertError } = await supabase
          .from('tracks')
          .insert({
            title: metadata.title,
            artist: metadata.artist,
            audio_url: publicUrl,
            order_index: nextOrderIndex++,
            user_id: user?.id,
          });

        if (insertError) throw insertError;

        successCount++;
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        failedFiles.push(file.name);
      }
    }

    setIsUploading(false);
    setUploadProgress({ current: 0, total: 0 });

    // Refresh the track list
    await queryClient.invalidateQueries({ queryKey: ['tracks'] });

    // Reset file inputs
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
    }
    if (multipleFilesInputRef.current) {
      multipleFilesInputRef.current.value = '';
    }

    // Show results
    if (successCount > 0) {
      toast({
        title: 'Upload complete',
        description: `Successfully uploaded ${successCount} of ${mp3Files.length} tracks${
          failedFiles.length > 0 ? `. Failed: ${failedFiles.slice(0, 3).join(', ')}${failedFiles.length > 3 ? '...' : ''}` : ''
        }`,
      });
    } else {
      toast({
        title: 'Upload failed',
        description: 'All files failed to upload. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleUploadLabel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadingLabel) return;

    // Check if storage buckets exist before attempting upload
    if (storageHealth && !storageHealth.labelImages.exists) {
      toast({
        title: 'Backend Setup Required',
        description: 'The label-images storage bucket does not exist. See the warning banner above for setup instructions.',
        variant: 'destructive',
      });
      return;
    }

    const validExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
    const fileExt = uploadingLabel.name.toLowerCase().slice(uploadingLabel.name.lastIndexOf('.'));
    
    if (!validExtensions.includes(fileExt)) {
      toast({
        title: 'Invalid file type',
        description: 'Only PNG, JPG, JPEG, and WebP images are allowed',
        variant: 'destructive',
      });
      return;
    }

    const validMimeTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validMimeTypes.includes(uploadingLabel.type)) {
      toast({
        title: 'Invalid MIME type',
        description: 'Only image files are allowed',
        variant: 'destructive',
      });
      return;
    }

    if (uploadingLabel.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Label image must be less than 5MB',
        variant: 'destructive',
      });
      return;
    }

    setUploadingLabelImage(true);
    try {
      await uploadLabelImage.mutateAsync(uploadingLabel);
      setLabelUploadDialogOpen(false);
      setUploadingLabel(null);
    } catch (error) {
      // Error handled by mutation
    } finally {
      setUploadingLabelImage(false);
    }
  };

  const handleSetActiveLabel = async (labelId: string) => {
    await setActiveLabelImage.mutateAsync(labelId);
  };

  const handleDeleteLabel = async () => {
    if (selectedLabel) {
      await deleteLabelImage.mutateAsync({
        labelId: selectedLabel.id,
        imageUrl: selectedLabel.image_url,
      });
      setLabelDeleteDialogOpen(false);
      setSelectedLabel(null);
    }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-6 w-6" />
              <CardTitle>Admin Login</CardTitle>
            </div>
            <CardDescription>Single-admin system</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" required autoComplete="username" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required autoComplete="current-password" />
              </div>
              <Button type="submit" className="w-full" disabled={loggingIn}>{loggingIn ? 'Signing in...' : 'Sign In'}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (roleLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (role !== 'admin') return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-8">
      {/* Password change dialog - non-dismissible when required */}
      <Dialog open={needsPasswordChange} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Change Password Required</DialogTitle>
            <DialogDescription>For security, you must change your password before accessing the admin dashboard.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
            </div>
            <Button type="submit" className="w-full" disabled={changingPassword}>{changingPassword ? 'Changing...' : 'Change Password'}</Button>
          </form>
        </DialogContent>
      </Dialog>
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Track Management</h1>
          <div className="flex gap-2">
            <Button onClick={handleLogout} variant="outline">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        {/* Storage Buckets Missing Warning Banner */}
        {storageHealth && !storageHealth.allHealthy && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle className="text-lg font-semibold">Storage Buckets Missing</AlertTitle>
            <AlertDescription className="mt-2 space-y-3">
              <p className="text-sm">
                Your backend is missing storage buckets required for uploads. This is common in remixed projects 
                because Supabase's pg_dump process doesn't capture storage bucket configurations.
              </p>
              
              <div className="space-y-1 text-sm">
                <p className="font-medium">Missing buckets:</p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  {!storageHealth.tracks.exists && (
                    <li>
                      <span className="font-mono">tracks</span> - Required for MP3 uploads
                      {storageHealth.tracks.error && (
                        <span className="text-xs ml-2">({storageHealth.tracks.error})</span>
                      )}
                    </li>
                  )}
                  {!storageHealth.labelImages.exists && (
                    <li>
                      <span className="font-mono">label-images</span> - Required for label image uploads
                      {storageHealth.labelImages.error && (
                        <span className="text-xs ml-2">({storageHealth.labelImages.error})</span>
                      )}
                    </li>
                  )}
                </ul>
              </div>

              <div className="pt-2 space-y-2">
                <p className="text-sm font-medium">To fix this:</p>
                <ol className="list-decimal list-inside ml-2 space-y-1 text-sm">
                  <li>Copy the SQL migration below</li>
                  <li>Open your backend (Cloud tab → Database)</li>
                  <li>Create a new migration and paste the SQL</li>
                  <li>Run the migration</li>
                  <li>Refresh this page</li>
                </ol>
                
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMigrationSQL(!showMigrationSQL)}
                  >
                    {showMigrationSQL ? 'Hide' : 'Show'} SQL Migration
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(STORAGE_BUCKETS_MIGRATION);
                      toast({ title: 'SQL copied to clipboard!' });
                    }}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy SQL
                  </Button>
                </div>

                {showMigrationSQL && (
                  <pre className="mt-3 p-3 bg-muted rounded-md text-xs overflow-x-auto max-h-64">
                    {STORAGE_BUCKETS_MIGRATION}
                  </pre>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>All Tracks</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button 
                onClick={() => folderInputRef.current?.click()}
                disabled={isUploading}
                variant="secondary"
              >
                <FolderUp className="mr-2 h-4 w-4" />
                {isUploading ? `Uploading ${uploadProgress.current}/${uploadProgress.total}...` : 'Bulk Upload Folder'}
              </Button>
              <Button 
                onClick={() => multipleFilesInputRef.current?.click()}
                disabled={isUploading}
                variant="secondary"
              >
                <Upload className="mr-2 h-4 w-4" />
                Select Multiple Files
              </Button>
              <Button onClick={() => setAddDialogOpen(true)} disabled={isUploading}>
                <Plus className="mr-2 h-4 w-4" />
                Add Track
              </Button>
              <input
                ref={folderInputRef}
                type="file"
                accept=".mp3"
                multiple
                {...({ webkitdirectory: '', directory: '' } as any)}
                onChange={handleBulkUpload}
                className="hidden"
              />
              <input
                ref={multipleFilesInputRef}
                type="file"
                accept=".mp3"
                multiple
                onChange={handleBulkUpload}
                className="hidden"
              />
            </div>
          </CardHeader>
          <CardContent>
            {tracksLoading ? (
              <p>Loading tracks...</p>
            ) : tracks?.length === 0 ? (
              <p className="text-muted-foreground">No tracks yet. Add your first track!</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Artist</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tracks?.map((track) => (
                    <TableRow key={track.id}>
                      <TableCell className="font-medium">{track.title}</TableCell>
                      <TableCell>{track.artist}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedTrack(track);
                            setEditTitle(track.title);
                            setEditArtist(track.artist);
                            setEditDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedTrack(track);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Label Images</CardTitle>
          </CardHeader>
          <CardContent>
            {labelsLoading ? (
              <p>Loading label images...</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {labelImages?.map((label) => (
                  <div key={label.id} className="border rounded-lg p-4 relative">
                    <div className="aspect-square rounded overflow-hidden bg-muted">
                      <img
                        src={label.image_url}
                        alt={label.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <p className="text-sm font-medium mt-2">{label.name}</p>
                    <div className="flex gap-2 mt-2 absolute top-2 right-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleSetActiveLabel(label.id)}
                        disabled={label.is_active}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => {
                          setSelectedLabel(label);
                          setLabelDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {label.is_active && (
                      <div className="absolute top-2 left-2 bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-xs font-medium">
                        Active
                      </div>
                    )}
                  </div>
                ))}
                <Button onClick={() => setLabelUploadDialogOpen(true)} variant="secondary">
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Upload Label Image
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Track</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedTrack?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Track</DialogTitle>
            <DialogDescription>
              Update the track information below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Artist</label>
              <Input
                value={editArtist}
                onChange={(e) => setEditArtist(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Track</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddTrack} className="space-y-4">
            <div>
              <Label htmlFor="new-title">Title</Label>
              <Input
                id="new-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="new-artist">Artist</Label>
              <Input
                id="new-artist"
                value={newArtist}
                onChange={(e) => setNewArtist(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="file-upload">MP3 File</Label>
              <div className="flex gap-2">
                <Input
                  id="file-upload"
                  type="file"
                  accept=".mp3"
                  onChange={(e) => setUploadingFile(e.target.files?.[0] || null)}
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={uploading}>
                {uploading ? 'Uploading...' : 'Add Track'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={labelUploadDialogOpen} onOpenChange={setLabelUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Label Image</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUploadLabel} className="space-y-4">
            <div>
              <Label htmlFor="label-upload">Image File</Label>
              <Input
                id="label-upload"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => setUploadingLabel(e.target.files?.[0] || null)}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                PNG, JPG, JPEG, or WebP • Max 5MB • Square images recommended
              </p>
            </div>
            {uploadingLabel && (
              <div className="border rounded-lg p-2">
                <p className="text-sm font-medium">Preview:</p>
                <div className="aspect-square mt-2 rounded overflow-hidden bg-muted max-w-[200px]">
                  <img 
                    src={URL.createObjectURL(uploadingLabel)} 
                    alt="Preview"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setLabelUploadDialogOpen(false);
                  setUploadingLabel(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={uploadingLabelImage}>
                {uploadingLabelImage ? 'Uploading...' : 'Upload Label'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={labelDeleteDialogOpen} onOpenChange={setLabelDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Label Image?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{selectedLabel?.name}". This action cannot be undone.
              {selectedLabel?.is_active && ' The player will fall back to the default label.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLabel}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
