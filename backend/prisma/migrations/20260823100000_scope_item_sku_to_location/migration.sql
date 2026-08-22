-- Item SKUs may exist at multiple locations, but remain unique within a location.
DROP INDEX "Item_sku_key";
CREATE UNIQUE INDEX "Item_sku_locationId_key" ON "Item"("sku", "locationId");