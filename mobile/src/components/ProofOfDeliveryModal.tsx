import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Camera, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProofOfDeliveryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName: string;
  orderId: string;
  onConfirm: () => void;
}

const ProofOfDeliveryModal = ({
  open,
  onOpenChange,
  customerName,
  orderId,
  onConfirm,
}: ProofOfDeliveryModalProps) => {
  const [notes, setNotes] = useState("");
  const [photoTaken, setPhotoTaken] = useState(false);
  const { toast } = useToast();

  const handleTakePhoto = () => {
    // Mock photo taking - in real app, this would open camera
    setPhotoTaken(true);
    toast({
      title: "Photo captured",
      description: "Delivery photo has been taken successfully",
    });
  };

  const handleConfirmDelivery = () => {
    if (!photoTaken) {
      toast({
        title: "Photo required",
        description: "Please take a photo as proof of delivery",
        variant: "destructive",
      });
      return;
    }

    onConfirm();
    onOpenChange(false);
    setNotes("");
    setPhotoTaken(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
    setNotes("");
    setPhotoTaken(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Proof of Delivery
          </DialogTitle>
          <DialogDescription>
            Take a photo as proof of delivery for order #{orderId} to {customerName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Button
              onClick={handleTakePhoto}
              variant={photoTaken ? "success" : "outline"}
              className="w-full"
              size="lg"
            >
              <Camera className="mr-2 h-4 w-4" />
              {photoTaken ? "Photo Taken ✓" : "Take Photo"}
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional delivery notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={handleCancel} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleConfirmDelivery} className="flex-1">
            Confirm Delivery
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProofOfDeliveryModal;