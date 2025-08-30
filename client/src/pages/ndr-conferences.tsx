import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Plus, Edit, Trash2, Calendar, MapPin, Building } from "lucide-react";
import type { NdrConference, InsertNdrConference } from "@shared/schema";
import NdrConferenceForm from "@/components/ndr-conferences/ndr-conference-form";

export default function NdrConferences() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConference, setEditingConference] = useState<NdrConference | null>(null);
  const queryClient = useQueryClient();

  const { data: conferences = [], isLoading } = useQuery<NdrConference[]>({
    queryKey: ["/api/ndr-conferences"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/ndr-conferences/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete conference");
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ndr-conferences"] });
    },
  });

  const filteredConferences = conferences.filter((conference: NdrConference) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      conference.name.toLowerCase().includes(searchLower) ||
      conference.hostCompany.toLowerCase().includes(searchLower) ||
      conference.cityHeld.toLowerCase().includes(searchLower) ||
      conference.place.toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (startDate: Date, endDate: Date) => {
    const now = new Date();
    const start = new Date(startDate.toString().split('T')[0] + 'T00:00:00');
    const end = new Date(endDate.toString().split('T')[0] + 'T23:59:59');
    
    if (now < start) {
      return <Badge variant="outline" className="bg-blue-50 text-blue-700">Upcoming</Badge>;
    } else if (now >= start && now <= end) {
      return <Badge className="bg-green-100 text-green-800">Ongoing</Badge>;
    } else {
      return <Badge variant="secondary">Completed</Badge>;
    }
  };

  const handleEdit = (conference: NdrConference) => {
    setEditingConference(conference);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingConference(null);
  };

  return (
    <div>
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">NDR/컨퍼런스/Corp Day</h2>
            <p className="text-gray-600 mt-1">실적발표회, NDR, Corporate Day 등의 IR Conference Database</p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingConference(null)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Event
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingConference ? "Edit Conference" : "Add Event"}
                  </DialogTitle>
                </DialogHeader>
                <NdrConferenceForm 
                  conference={editingConference}
                  onSuccess={handleCloseDialog}
                  onCancel={handleCloseDialog}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
      <div className="mb-6">
        <Input
          placeholder="Search conferences by name, host company, city, or place..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
      </div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event Name</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Host Company</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Loading conferences...
                </TableCell>
              </TableRow>
            ) : filteredConferences.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  {searchQuery ? "No conferences match your search." : "No conferences found. Create your first conference to get started."}
                </TableCell>
              </TableRow>
            ) : (
              filteredConferences.map((conference: NdrConference) => (
                <TableRow key={conference.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <div className="flex flex-col">
                        <span>{conference.name}</span>
                        <Badge variant="outline" className="w-fit text-xs mt-1">
                          {conference.conferenceType || "국내NDR"}
                        </Badge>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{format(new Date(conference.startDate.toString().split('T')[0] + 'T00:00:00'), "MMM dd, yyyy")}</div>
                      <div className="text-gray-500">to {format(new Date(conference.endDate.toString().split('T')[0] + 'T00:00:00'), "MMM dd, yyyy")}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(conference.startDate, conference.endDate)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <div className="text-sm">
                        <div>{conference.place}</div>
                        <div className="text-gray-500">{conference.cityHeld}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Building className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{conference.hostCompany}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(conference)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(conference.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}