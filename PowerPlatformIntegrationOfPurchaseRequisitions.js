/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */
define(['N/record', 'N/search'], function(record,search) {

    function _get(dataIn) {
        try {
            log.debug('dataIn',dataIn);
            if(dataIn.recordType == "purchaserequisition"){
                log.debug('recordType',dataIn.recordType);
                var purchaseRequisitionSearch = search.create({
                    type: search.Type.PURCHASE_REQUISITION,
                    filters: ['mainline', 'is', 'false'],
                    columns: ["recordtype","internalid","tranid","trandate","entity","location","currency","memo",
                    "item",
                    "quantity",
                    search.createColumn({
                       name: "cost",
                       join: "item"
                    }),
                    "estimatedamount",
                    "unit",
                    search.createColumn({
                       name: "salesdescription",
                       join: "item"
                    }),
                    search.createColumn({
                       name: "vendorname",
                       join: "item"
                    })] // Add the fields you want to retrieve
                });
                var searchResults = purchaseRequisitionSearch.run().getRange({
                    start: 0,
                    end: 100 // Adjust the range as needed
                });
                var requisitions = [];
        var requisitionMap = new Map();

        searchResults.forEach(function (result) {
          var internalId = result.getValue('internalid');

          if (!requisitionMap.has(internalId)) {
            requisitionMap.set(internalId, {
              internalId: result.getValue('internalid'),
              tranid: result.getValue('tranid'),
              trandate: result.getValue('trandate'),
              entity: result.getValue('entity'),
              location: result.getValue('location'),
              currency: result.getValue('currency'),
              memo: result.getValue('memo'),
              lineItems: [],
            });
          }

          requisitionMap.get(internalId).lineItems.push({
            item: result.getValue('item'),
            itemName: result.getText('item'),
            quantity: result.getValue('quantity'),
            units: result.getValue('unit'),
            description: result.getValue({name: "salesdescription",join: "item"}),
            basePrice: result.getValue({name: "cost",join: "item"}),
            estimatedAmount: result.getValue('estimatedamount'),
            vendorName: result.getValue({name: "vendorname",join: "item"}),
          });
        });

        requisitionMap.forEach(function (requisition) {
          requisitions.push(requisition);
        });
                log.debug('requisitions',requisitions);
              return JSON.stringify(requisitions);
                // return {
                //     status: 'Success',
                //     records: requisitions
                // };
            }else if(dataIn.recordType == "item"){
                var inventoryitemSearchObj = search.create({
                    type: "inventoryitem",
                    filters:
                    [],
                    columns:
                    [
                       search.createColumn({
                          name: "itemid",
                          sort: search.Sort.ASC
                       }),
                       "internalid",
                       "displayname",
                       "salesdescription",
                       "type",
                       "baseprice",
                       "location",
                       "vendorname",
                       "unitstype"
                    ]
                 });
                 var items = [];
                 inventoryitemSearchObj.run().each(function(result){
                    // .run().each has a limit of 4,000 results
                    items.push({
                        internalid: result.getValue('internalid'),
                        name: result.getValue('itemid'),
                        salesdescription: result.getValue('salesdescription'),
                        type: result.getValue('type'),
                        baseprice: result.getText('baseprice'),
                        location: result.getValue('location'),
                        vendorname: result.getValue('vendorname'),
                        unitstype: result.getText('unitstype')
                    });
                    return true;
                 });
              return JSON.stringify(items);
                // return {
                //     status: 'Success',
                //     records: items
                // };
            }
        } catch (e) {
            return {
                status: 'Failed',
                message: e.message
            };
        }
    }

    function _post(data) {
        try {
            log.debug('data',data);
            log.debug('lineItems',data.purchaseRequisition.lineItems);
    
              // Create a new Purchase Requisition record
            var purchaseReq = record.create({
              type: record.Type.PURCHASE_REQUISITION,
              isDynamic: true,
            });
            
            // Set the Purchase Requisition fields based on the JSON data
            purchaseReq.setValue({
              fieldId: 'entity', 
              value: 748,
            });
              purchaseReq.setValue({
                fieldId: 'subsidiary', 
                value: 1,
              });
            
            // Loop through line items and add them to the Purchase Requisition
            data.purchaseRequisition.lineItems.forEach(function (lineItem) {
            log.debug('lineItem',lineItem);
              purchaseReq.selectNewLine({
                sublistId: 'item',
              });
              purchaseReq.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'item',
                value: lineItem.item,
              });
              purchaseReq.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'rate',
                value: lineItem.estimatedrate,
              });
              purchaseReq.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'quantity',
                value: lineItem.quantity,
              });
              purchaseReq.commitLine({
                sublistId: 'item',
              });
            });
      
            // Save the Purchase Requisition record
            var purchaseReqId = purchaseReq.save();
            return purchaseReqId;
          } catch (error) {
            log.debug('Exception:Post',error);
          }
    }
    return {
        get: _get,
        post: _post
    }
});