import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Plus, X, Package, MapPin, DollarSign } from 'lucide-react'

interface OrderItem {
  id: string
  category: string
  quantity: number
  weight: number // weight per item in kg
}

interface CreateOrderModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOrderCreate: (order: any) => void
}

export default function CreateOrderModal({ open, onOpenChange, onOrderCreate }: CreateOrderModalProps) {
  const [orderData, setOrderData] = useState({
    customerName: '',
    customerPhone: '',
    pickupAddress: '',
    deliveryAddress: '',
    deliveryPhone: '',
    deliveryBeneficiaryName: '',
    priority: 'standard',
    specialInstructions: '',
    items: [] as OrderItem[]
  })

  const [newItem, setNewItem] = useState({
    category: '',
    quantity: 1,
    weight: 0.5 // default weight in kg
  })

  const itemCategories = [
    'Electronics',
    'Food Items',
    'Clothing & Textiles',
    'Books & Documents',
    'Home & Garden',
    'Sports & Recreation',
    'Beauty & Personal Care',
    'Automotive Parts',
    'Medical Supplies',
    'Industrial Equipment',
    'Toys & Games',
    'Other'
  ]

  const addItem = () => {
    if (newItem.category && newItem.quantity > 0 && newItem.weight > 0) {
      const item: OrderItem = {
        id: Math.random().toString(36).substr(2, 9),
        category: newItem.category,
        quantity: newItem.quantity,
        weight: newItem.weight
      }
      setOrderData(prev => ({
        ...prev,
        items: [...prev.items, item]
      }))
      setNewItem({ category: '', quantity: 1, weight: 0.5 })
    }
  }

  const removeItem = (id: string) => {
    setOrderData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }))
  }

  const calculateOrderValue = () => {
    const basePrice = 150
    const priorityMultiplier = orderData.priority === 'urgent' ? 1.15 : orderData.priority === 'express' ? 1.05 : 1
    
    // Calculate total weight and weight-based charges
    const totalWeight = orderData.items.reduce((sum, item) => sum + (item.quantity * item.weight), 0)
    const weightCharge = totalWeight * 8 // $8 per kg
    
    // Item handling charge
    const itemCount = orderData.items.reduce((sum, item) => sum + item.quantity, 0)
    const itemHandlingCharge = itemCount * 3 // $3 per item for handling
    
    return (basePrice * priorityMultiplier) + weightCharge + itemHandlingCharge
  }

  const handleSubmit = () => {
    // Check required fields
    const requiredFields = {
      'Customer Name': orderData.customerName.trim(),
      'Customer Phone': orderData.customerPhone.trim(),
      'Pickup Address': orderData.pickupAddress.trim(),
      'Delivery Address': orderData.deliveryAddress.trim(),
      'Delivery Phone': orderData.deliveryPhone.trim(),
      'Delivery Beneficiary Name': orderData.deliveryBeneficiaryName.trim()
    }

    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([field, _]) => field)

    if (missingFields.length > 0) {
      alert(`Please fill in the following required fields:\n• ${missingFields.join('\n• ')}`)
      return
    }

    if (orderData.items.length === 0) {
      alert('Please add at least one item to the order.')
      return
    }

    const orderValue = calculateOrderValue()
    
    // Cash payment confirmation
    const proceedWithCashPayment = window.confirm(
      `Order Summary:\n\nCustomer: ${orderData.customerName}\nDelivery to: ${orderData.deliveryBeneficiaryName}\nItems: ${orderData.items.length} item categories\nTotal Amount: $${orderValue.toFixed(2)}\n\nPayment Method: Cash on Delivery\n\nConfirm order creation?`
    )
    
    if (proceedWithCashPayment) {
      const order = {
        id: `ORD-${Date.now()}`,
        ...orderData,
        status: 'Processing',
        createdAt: new Date().toISOString(),
        estimatedValue: orderValue,
        destination: orderData.deliveryAddress.split(',')[0] // Use first part of address as destination
      }
      
      onOrderCreate(order)
      
      // Success message
      alert(`Order ${order.id} created successfully!\n\nPayment: Cash on Delivery\nAmount: $${orderValue.toFixed(2)}\n\nThe order has been added to your order list.`)
      
      // Reset form
      setOrderData({
        customerName: '',
        customerPhone: '',
        pickupAddress: '',
        deliveryAddress: '',
        deliveryPhone: '',
        deliveryBeneficiaryName: '',
        priority: 'standard',
        specialInstructions: '',
        items: []
      })
      setNewItem({ category: '', quantity: 1, weight: 0.5 })
      onOpenChange(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      action()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Create New Order
          </DialogTitle>
          <DialogDescription>
            Fill in the order details and add items for pickup and delivery
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Customer Information */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold text-lg">Customer Information</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="customerName">Customer Name *</Label>
                  <Input
                    id="customerName"
                    value={orderData.customerName}
                    onChange={(e) => setOrderData(prev => ({ ...prev, customerName: e.target.value }))}
                    placeholder="Enter customer name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="customerPhone">Customer Phone *</Label>
                  <Input
                    id="customerPhone"
                    value={orderData.customerPhone}
                    onChange={(e) => setOrderData(prev => ({ ...prev, customerPhone: e.target.value }))}
                    placeholder="+94 XX XXX XXXX"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="pickupAddress">Pickup Address *</Label>
                  <Textarea
                    id="pickupAddress"
                    value={orderData.pickupAddress}
                    onChange={(e) => setOrderData(prev => ({ ...prev, pickupAddress: e.target.value }))}
                    placeholder="Enter pickup address"
                    rows={2}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Information */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Delivery Information
              </h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="deliveryBeneficiaryName">Delivery Beneficiary Name *</Label>
                  <Input
                    id="deliveryBeneficiaryName"
                    value={orderData.deliveryBeneficiaryName}
                    onChange={(e) => setOrderData(prev => ({ ...prev, deliveryBeneficiaryName: e.target.value }))}
                    placeholder="Name of person receiving the order"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="deliveryPhone">Delivery Phone *</Label>
                  <Input
                    id="deliveryPhone"
                    value={orderData.deliveryPhone}
                    onChange={(e) => setOrderData(prev => ({ ...prev, deliveryPhone: e.target.value }))}
                    placeholder="+94 XX XXX XXXX"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="deliveryAddress">Delivery Address *</Label>
                  <Textarea
                    id="deliveryAddress"
                    value={orderData.deliveryAddress}
                    onChange={(e) => setOrderData(prev => ({ ...prev, deliveryAddress: e.target.value }))}
                    placeholder="Enter delivery address"
                    rows={2}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={orderData.priority} onValueChange={(value) => setOrderData(prev => ({ ...prev, priority: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="express">Express (+5%)</SelectItem>
                      <SelectItem value="urgent">Urgent (+15%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Items */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <h3 className="font-semibold text-lg">Order Items *</h3>
            
            {/* Add New Item */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 border border-border rounded-lg bg-muted/30">
              <div>
                <Label htmlFor="itemCategory">Item Category</Label>
                <Select value={newItem.category} onValueChange={(value) => setNewItem(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select item category" />
                  </SelectTrigger>
                  <SelectContent>
                    {itemCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={newItem.quantity}
                  onChange={(e) => {
                    const value = Math.max(1, parseInt(e.target.value) || 1)
                    setNewItem(prev => ({ ...prev, quantity: value }))
                  }}
                  min="1"
                  onKeyPress={(e) => handleKeyPress(e, addItem)}
                />
              </div>
              <div>
                <Label htmlFor="weight">Weight per Parcel (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  value={newItem.weight}
                  onChange={(e) => {
                    const value = Math.max(0.1, parseFloat(e.target.value) || 0.5)
                    setNewItem(prev => ({ ...prev, weight: value }))
                  }}
                  min="0.1"
                  placeholder="0.5"
                  onKeyPress={(e) => handleKeyPress(e, addItem)}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={addItem} className="w-full" disabled={!newItem.category || newItem.weight <= 0}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Item
                </Button>
              </div>
            </div>

            {/* Items List */}
            {orderData.items.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Added Items:</h4>
                {orderData.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border border-border rounded-lg bg-card">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <span className="font-medium">{item.category}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Quantity: {item.quantity}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Weight: {item.weight}kg each (Total: {(item.quantity * item.weight).toFixed(1)}kg)
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(item.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <div className="mt-2 p-2 bg-muted/50 rounded text-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div><strong>Total Items:</strong> {orderData.items.reduce((sum, item) => sum + item.quantity, 0)}</div>
                    <div><strong>Total Weight:</strong> {orderData.items.reduce((sum, item) => sum + (item.quantity * item.weight), 0).toFixed(1)}kg</div>
                  </div>
                </div>
              </div>
            )}

            {orderData.items.length === 0 && (
              <div className="text-center py-4 text-muted-foreground text-sm">
                No items added yet. Add at least one item to continue.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Special Instructions */}
        <div>
          <Label htmlFor="specialInstructions">Special Instructions</Label>
          <Textarea
            id="specialInstructions"
            value={orderData.specialInstructions}
            onChange={(e) => setOrderData(prev => ({ ...prev, specialInstructions: e.target.value }))}
            placeholder="Any special handling instructions..."
            rows={3}
          />
        </div>

        {/* Order Summary */}
        {orderData.items.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-lg flex items-center gap-2 mb-3">
                <DollarSign className="w-4 h-4" />
                Order Summary
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Base delivery fee:</span>
                  <span>$150.00</span>
                </div>
                {orderData.priority !== 'standard' && (
                  <div className="flex justify-between">
                    <span>Priority surcharge ({orderData.priority}):</span>
                    <span>${orderData.priority === 'urgent' ? '22.50' : '7.50'}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Weight charges ({orderData.items.reduce((sum, item) => sum + (item.quantity * item.weight), 0).toFixed(1)}kg @ $8/kg):</span>
                  <span>${(orderData.items.reduce((sum, item) => sum + (item.quantity * item.weight), 0) * 8).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Item handling charges ({orderData.items.reduce((sum, item) => sum + item.quantity, 0)} items @ $3/item):</span>
                  <span>${(orderData.items.reduce((sum, item) => sum + item.quantity, 0) * 3).toFixed(2)}</span>
                </div>
                <Separator />
                <div className="border-t border-border pt-2 flex justify-between font-medium text-base">
                  <span>Total Amount:</span>
                  <span className="text-primary font-bold">${calculateOrderValue().toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!orderData.customerName.trim() || !orderData.deliveryAddress.trim() || orderData.items.length === 0}
            className="gradient-primary"
          >
            <Package className="w-4 h-4 mr-2" />
            Create Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}