import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, Eye, Edit, Trash2, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import type { MeetingLog, InsertMeetingLog, Investor } from "@shared/schema";
import MeetingLogForm from "@/components/meeting-logs/meeting-log-form";

export default function MeetingLogs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMeetingLog, setEditingMeetingLog] = useState<MeetingLog | null>(null);
  const queryClient = useQueryClient();

  const { data: meetingLogs = [], isLoading } = useQuery<MeetingLog[]>({
    queryKey: ["/api/meeting-logs"],
  });

  const { data: investors = [] } = useQuery<Investor[]>({
    queryKey: ["/api/investors"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/meeting-logs/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete meeting log");
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meeting-logs"] });
    },
  });

  const filteredMeetingLogs = meetingLogs.filter((log: MeetingLog) => {
    const investor = investors.find((inv: Investor) => inv.id === log.investorId);
    return investor?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           log.place.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getInvestorName = (investorId: number) => {
    const investor = investors.find((inv: Investor) => inv.id === investorId);
    return investor?.name || "Unknown";
  };

  const getPlaceBadgeColor = (place: string) => {
    switch (place.toLowerCase()) {
      case 'ndr/conference':
        return 'bg-blue-100 text-blue-800';
      case 'inoffice':
        return 'bg-green-100 text-green-800';
      case 'other':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleEdit = (meetingLog: MeetingLog) => {
    setEditingMeetingLog(meetingLog);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingMeetingLog(null);
  };

  return (
    <div>
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Meeting Logs</h2>
            <p className="text-gray-600 mt-1">Track and manage meeting records with investors</p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingMeetingLog(null)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Meeting Log
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingMeetingLog ? "Edit Meeting Log" : "Add New Meeting Log"}
                  </DialogTitle>
                </DialogHeader>
                <MeetingLogForm 
                  meetingLog={editingMeetingLog}
                  onSuccess={handleCloseDialog}
                  onCancel={handleCloseDialog}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Meeting Logs</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search meeting logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-center">Loading meeting logs...</div>
          ) : filteredMeetingLogs.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No meeting logs found. Add your first meeting log to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 w-[20%]">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 w-[30%]">Investor</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 w-[25%]">Place</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-900 w-[25%]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredMeetingLogs.map((log: MeetingLog) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center text-sm">
                          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                          {format(new Date(log.date), "MMM dd, yyyy")}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm font-medium text-gray-900">
                          {getInvestorName(log.investorId)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={getPlaceBadgeColor(log.place)}>
                          {log.place}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(log)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMutation.mutate(log.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}