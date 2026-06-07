from rest_framework import generics, filters, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import SparePart, StockTransaction
from .serializers import SparePartSerializer, StockTransactionSerializer
from accounts.audit import log_action


class IsManagerOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.role == 'manager'


class SparePartListCreateView(generics.ListCreateAPIView):
    queryset = SparePart.objects.all()
    serializer_class = SparePartSerializer
    permission_classes = [IsManagerOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'part_number']

    def perform_create(self, serializer):
        obj = serializer.save()
        log_action(self.request, 'create', 'Spare Part', obj.name,
                   f'Added part {obj.name} (#{obj.part_number}) — qty: {obj.quantity_in_stock}')


class SparePartDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = SparePart.objects.all()
    serializer_class = SparePartSerializer
    permission_classes = [IsManagerOrReadOnly]

    def perform_update(self, serializer):
        obj = serializer.save()
        log_action(self.request, 'update', 'Spare Part', obj.name,
                   f'Updated part {obj.name} — qty: {obj.quantity_in_stock}')

    def perform_destroy(self, instance):
        log_action(self.request, 'delete', 'Spare Part', instance.name,
                   f'Deleted part {instance.name} (#{instance.part_number})')
        instance.delete()


class StockTransactionListCreateView(generics.ListCreateAPIView):
    queryset = StockTransaction.objects.select_related('part', 'performed_by').all()
    serializer_class = StockTransactionSerializer

    def perform_create(self, serializer):
        obj = serializer.save(performed_by=self.request.user)
        action = 'checkout' if obj.transaction_type == 'out' else 'create'
        log_action(self.request, action, 'Inventory', obj.part.name,
                   f'{obj.get_transaction_type_display()} {obj.quantity}x {obj.part.name} — {obj.notes}')


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def low_stock_parts(request):
    parts = [p for p in SparePart.objects.all() if p.is_low_stock]
    data = SparePartSerializer(parts, many=True).data
    return Response(data)
