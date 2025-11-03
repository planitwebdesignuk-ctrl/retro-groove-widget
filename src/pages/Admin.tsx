import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useTracks, useDeleteTrack, useUpdateTrack } from '@/hooks/useTracks';
import { useLabelImages, useSetActiveLabelImage, useDeleteLabelImage } from '@/hooks/useLabelImages';
import { Pencil, Trash2, LogOut, Plus, FolderUp, Upload, Image } from 'lucide-react';
import { extractMp3Metadata } from '@/utils/mp3Metadata';
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
} from '@/components/ui/dialog';

export default function Admin() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const { data: role, isLoading: roleLoading } = useUserRole(user?.id);
  const { data: tracks, isLoading: tracksLoading } = useTracks();
  const deleteTrack = useDeleteTrack();
  const updateTrack = useUpdateTrack();
  const { data: labelImages, isLoading: labelImagesLoading } = useLabelImages();
  const setActiveLabelImage = useSetActiveLabelImage();
  const deleteLabelImage = useDeleteLabelImage();

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
  const labelImageInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLabel, setUploadingLabel] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
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

      if (uploadError) throw uploadError;

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

        if (uploadError) throw uploadError;

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

  const handleLabelImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file (PNG, JPG, etc.)',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Image must be less than 5MB',
        variant: 'destructive',
      });
      return;
    }

    // Validate image dimensions (square)
    const img = document.createElement('img');
    const objectUrl = URL.createObjectURL(file);
    
    img.onload = async () => {
      URL.revokeObjectURL(objectUrl);

      if (img.width !== img.height) {
        toast({
          title: 'Invalid dimensions',
          description: 'Label image must be square (same width and height)',
          variant: 'destructive',
        });
        return;
      }

      setUploadingLabel(true);
      try {
        // Upload to storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('label-images')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('label-images')
          .getPublicUrl(fileName);

        // Insert into database
        const { error: insertError } = await supabase
          .from('label_images')
          .insert({
            name: file.name,
            image_url: publicUrl,
            uploaded_by: user?.id,
            file_size: file.size,
            is_active: (labelImages?.length || 0) === 0, // Set as active if it's the first one
          });

        if (insertError) throw insertError;

        await queryClient.invalidateQueries({ queryKey: ['label-images'] });
        toast({ title: 'Label image uploaded successfully!' });
        
        if (labelImageInputRef.current) {
          labelImageInputRef.current.value = '';
        }
      } catch (error: any) {
        toast({
          title: 'Error uploading label image',
          description: error.message,
          variant: 'destructive',
        });
      } finally {
        setUploadingLabel(false);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      toast({
        title: 'Invalid image',
        description: 'Unable to load image file',
        variant: 'destructive',
      });
    };

    img.src = objectUrl;
  };

  if (authLoading || (user && roleLoading)) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Track Management</h1>
          <Button onClick={handleLogout} variant="outline">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>

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
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedTrack(track);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Label Images</CardTitle>
            <div>
              <Button 
                onClick={() => labelImageInputRef.current?.click()}
                disabled={uploadingLabel}
              >
                <Image className="mr-2 h-4 w-4" />
                {uploadingLabel ? 'Uploading...' : 'Upload Label Image'}
              </Button>
              <input
                ref={labelImageInputRef}
                type="file"
                accept="image/*"
                onChange={handleLabelImageUpload}
                className="hidden"
              />
            </div>
          </CardHeader>
          <CardContent>
            {labelImagesLoading ? (
              <p>Loading label images...</p>
            ) : labelImages?.length === 0 ? (
              <p className="text-muted-foreground">No label images yet. Upload your first label template!</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Preview</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {labelImages?.map((labelImage) => (
                    <TableRow key={labelImage.id} className={labelImage.is_active ? 'bg-primary/5' : ''}>
                      <TableCell>
                        <img 
                          src={labelImage.image_url} 
                          alt={labelImage.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      </TableCell>
                      <TableCell className="font-medium">{labelImage.name}</TableCell>
                      <TableCell>{(labelImage.file_size / 1024).toFixed(1)} KB</TableCell>
                      <TableCell>{new Date(labelImage.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button
                          variant={labelImage.is_active ? "default" : "outline"}
                          size="sm"
                          onClick={() => setActiveLabelImage.mutate(labelImage.id)}
                          disabled={labelImage.is_active}
                        >
                          {labelImage.is_active ? 'Active' : 'Set Active'}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteLabelImage.mutate(labelImage.id)}
                          disabled={labelImage.is_active}
                          title={labelImage.is_active ? 'Cannot delete active label' : 'Delete label'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{selectedTrack?.title}". This action cannot be undone.
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
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-artist">Artist</Label>
              <Input
                id="edit-artist"
                value={editArtist}
                onChange={(e) => setEditArtist(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEdit}>Save</Button>
            </div>
          </div>
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
    </div>
  );
}
