<script>
export default {
  name: 'AdminCrud',
  
  data() {
    return {
      // Tables and schema data
      tables: [],
      selectedTable: null,
      tableSchema: [],
      tableData: [],
      
      // UI state
      loading: false,
      error: null,
      currentPage: 1,
      itemsPerPage: 10,
      pagination: {},
      sortBy: 'id',
      sortOrder: 'asc',
      searchQuery: '',
      searchTimeout: null,
      
      // Modals
      showCreateModal: false,
      showEditModal: false,
      showDeleteModal: false,
      showAttachmentModal: false,
      
      // Record data
      newRecord: {},
      editedRecord: {},
      recordToDelete: null,
      
      // Foreign keys management
      relatedTableOptions: {},
      
      // Attachments
      currentAttachment: null,
      uploadFile: null,
      
      // Computed properties cache
      editableColumnsCache: null,
      isAttachmentsTableCache: null
    };
  },
  
  computed: {
    editableColumns() {
      if (this.editableColumnsCache) return this.editableColumnsCache;
      
      const result = this.tableSchema.filter(column => {
        // Exclude auto-incrementing ids, timestamps, etc.
        const excludePatterns = [
          /^created_at$/i,
          /^updated_at$/i,
          /^timestamp$/i
        ];
        
        const isExcluded = excludePatterns.some(pattern => pattern.test(column.name));
        const isAutoIncrement = column.isPrimaryKey && column.default && column.default.includes('nextval');
        
        return !isExcluded && !isAutoIncrement;
      });
      
      this.editableColumnsCache = result;
      return result;
    },
    
    isAttachmentsTable() {
      if (this.isAttachmentsTableCache !== null) return this.isAttachmentsTableCache;
      
      const result = this.selectedTable === 'attachments';
      this.isAttachmentsTableCache = result;
      return result;
    }
  },
  
  mounted() {
    this.fetchTables();
  },
  
  methods: {
    // Data fetching methods
    
    async fetchTables() {
      try {
        this.loading = true;
        const response = await fetch('/api/admin/tables', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch tables: ${response.status}`);
        }
        
        const data = await response.json();
        this.tables = data.tables;
        
        if (this.tables.length > 0) {
          this.selectedTable = this.tables[0];
          await this.onTableChange();
        }
      } catch (error) {
        console.error('Error fetching tables:', error);
        this.error = `Failed to load tables: ${error.message}`;
      } finally {
        this.loading = false;
      }
    },
    
    async onTableChange() {
      // Reset state when table changes
      this.currentPage = 1;
      this.searchQuery = '';
      this.sortBy = 'id';
      this.sortOrder = 'asc';
      this.editableColumnsCache = null;
      this.isAttachmentsTableCache = null;
      
      // Reset UI state
      this.error = null;
      
      // Wait for both schema and data to load
      await Promise.all([
        this.fetchTableSchema(),
        this.fetchTableData()
      ]);
      
      // Pre-fetch any related tables for foreign keys
      await this.preloadRelatedTables();
    },
    
    async fetchTableSchema() {
      try {
        this.loading = true;
        const response = await fetch(`/api/admin/tables/${this.selectedTable}/schema`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch schema: ${response.status}`);
        }
        
        const { schema } = await response.json();
        this.tableSchema = schema;
        
        // Set the default sort column to the primary key if found, otherwise the first column
        const primaryKeyColumn = schema.find(col => col.isPrimaryKey);
        if (primaryKeyColumn) {
          this.sortBy = primaryKeyColumn.name;
        } else if (schema.length > 0) {
          this.sortBy = schema[0].name;
        }
        
      } catch (error) {
        console.error('Error fetching table schema:', error);
        this.error = `Failed to load schema: ${error.message}`;
      } finally {
        this.loading = false;
      }
    },
    
    async fetchTableData() {
      try {
        this.loading = true;
        const queryParams = new URLSearchParams({
          page: this.currentPage,
          limit: this.itemsPerPage,
          sortBy: this.sortBy,
          sortOrder: this.sortOrder
        });
        
        if (this.searchQuery) {
          queryParams.append('search', this.searchQuery);
        }
        
        const response = await fetch(`/api/admin/tables/${this.selectedTable}?${queryParams}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.status}`);
        }
        
        const { data, pagination } = await response.json();
        this.tableData = data;
        this.pagination = pagination;
        
      } catch (error) {
        console.error('Error fetching table data:', error);
        this.error = `Failed to load data: ${error.message}`;
      } finally {
        this.loading = false;
      }
    },
    
    async preloadRelatedTables() {
      try {
        const foreignKeyColumns = this.tableSchema.filter(col => col.foreignKey);
        
        if (foreignKeyColumns.length === 0) {
          return;
        }
        
        const relatedTables = {};
        
        // For each foreign key relationship, fetch the related table
        await Promise.all(foreignKeyColumns.map(async column => {
          const relatedTable = column.foreignKey.table;
          const relatedColumn = column.foreignKey.column;
          
          // Fetch the related table data for foreign key selection
          const response = await fetch(`/api/admin/tables/${relatedTable}?limit=1000`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include'
          });
          
          if (!response.ok) {
            throw new Error(`Failed to fetch related table ${relatedTable}`);
          }
          
          const { data } = await response.json();
          
          // Find a good display field - prefer name, title, username, etc.
          const displayCandidates = [
            'name', 'username', 'title', 'label', 'email', 'description'
          ];
          
          // Get the schema for the related table
          const schemaResponse = await fetch(`/api/admin/tables/${relatedTable}/schema`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include'
          });
          
          if (!schemaResponse.ok) {
            throw new Error(`Failed to fetch schema for related table ${relatedTable}`);
          }
          
          const { schema: relatedSchema } = await schemaResponse.json();
          
          // Find a suitable display field
          let displayField = relatedColumn;
          for (const candidate of displayCandidates) {
            if (relatedSchema.some(col => col.name === candidate)) {
              displayField = candidate;
              break;
            }
          }
          
          // Map the related data to options for select dropdowns
          relatedTables[relatedTable] = data.map(item => ({
            value: item[relatedColumn],
            label: item[displayField] ? `${item[displayField]} (${item[relatedColumn]})` : item[relatedColumn]
          }));
        }));
        
        this.relatedTableOptions = relatedTables;
      } catch (error) {
        console.error('Error loading related tables:', error);
      }
    },
    
    // Record manipulation methods
    
    initCreateRecord() {
      // Initialize empty record based on schema
      const record = {};
      this.tableSchema.forEach(column => {
        if (column.type === 'boolean') {
          record[column.name] = false;
        } else {
          record[column.name] = null;
        }
      });
      
      this.newRecord = record;
      this.showCreateModal = true;
    },
    
    async createRecord() {
      try {
        // Special handling for attachments table with file upload
        if (this.isAttachmentsTable && this.uploadFile) {
          await this.uploadAttachment();
          return;
        }
        
        // Regular record creation
        const response = await fetch(`/api/admin/tables/${this.selectedTable}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(this.newRecord),
          credentials: 'include'
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to create record');
        }
        
        // Close modal and refresh data
        this.showCreateModal = false;
        await this.fetchTableData();
      } catch (error) {
        console.error('Error creating record:', error);
        alert(`Failed to create record: ${error.message}`);
      }
    },
    
    async uploadAttachment() {
      try {
        if (!this.uploadFile) {
          throw new Error('No file selected');
        }
        
        const formData = new FormData();
        formData.append('file', this.uploadFile);
        
        // Upload the file first
        const uploadResponse = await fetch('/api/admin/attachments/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });
        
        if (!uploadResponse.ok) {
          const error = await uploadResponse.json();
          throw new Error(error.message || 'Failed to upload file');
        }
        
        const fileData = await uploadResponse.json();
        
        // Create the attachment record
        const attachmentData = {
          ...this.newRecord,
          filename: fileData.file.filename,
          original_filename: fileData.file.originalname,
          file_size: fileData.file.size,
          mime_type: fileData.file.mimetype
        };
        
        const recordResponse = await fetch(`/api/admin/tables/${this.selectedTable}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(attachmentData),
          credentials: 'include'
        });
        
        if (!recordResponse.ok) {
          const error = await recordResponse.json();
          throw new Error(error.message || 'Failed to create attachment record');
        }
        
        // Close modal and refresh data
        this.showCreateModal = false;
        this.uploadFile = null;
        await this.fetchTableData();
        
      } catch (error) {
        console.error('Error uploading attachment:', error);
        alert(`Failed to upload attachment: ${error.message}`);
      }
    },
    
    editRecord(record) {
      // Create a copy to avoid directly modifying the table data
      this.editedRecord = { ...record };
      this.showEditModal = true;
    },
    
    async updateRecord() {
      try {
        // Find primary key column
        const pkColumn = this.tableSchema.find(col => col.isPrimaryKey);
        if (!pkColumn) {
          throw new Error('No primary key found for this table');
        }
        
        const id = this.editedRecord[pkColumn.name];
        
        const response = await fetch(`/api/admin/tables/${this.selectedTable}/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(this.editedRecord),
          credentials: 'include'
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to update record');
        }
        
        // Close modal and refresh data
        this.showEditModal = false;
        await this.fetchTableData();
      } catch (error) {
        console.error('Error updating record:', error);
        alert(`Failed to update record: ${error.message}`);
      }
    },
    
    confirmDelete(record) {
      this.recordToDelete = record;
      this.showDeleteModal = true;
    },
    
    async deleteRecord() {
      try {
        // Find primary key column
        const pkColumn = this.tableSchema.find(col => col.isPrimaryKey);
        if (!pkColumn) {
          throw new Error('No primary key found for this table');
        }
        
        const id = this.recordToDelete[pkColumn.name];
        
        const response = await fetch(`/api/admin/tables/${this.selectedTable}/${id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to delete record');
        }
        
        // Close modal and refresh data
        this.showDeleteModal = false;
        this.recordToDelete = null;
        await this.fetchTableData();
      } catch (error) {
        console.error('Error deleting record:', error);
        alert(`Failed to delete record: ${error.message}`);
      }
    },
    
    viewAttachment(attachment) {
      this.currentAttachment = attachment;
      this.showAttachmentModal = true;
    },
    
    // Helper methods
    
    isTimestampField(columnName, columnType) {
      return columnType.includes('timestamp') || 
             columnType.includes('date') || 
             columnName.includes('_at') || 
             columnName.includes('_date');
    },
    
    isJsonField(columnType) {
      return columnType.includes('json');
    },
    
    isBooleanField(columnType) {
      return columnType === 'boolean';
    },
    
    isLongTextField(columnType) {
      return columnType === 'text';
    },
    
    isForeignKey(column) {
      return column.foreignKey !== null;
    },
    
    hasFkRelationshipData(column, row) {
      return column.foreignKey && 
             this.relatedTableOptions[column.foreignKey.table] && 
             row[column.name] !== null;
    },
    
    getFkDisplay(column, row) {
      if (!this.hasFkRelationshipData(column, row)) {
        return row[column.name];
      }
      
      const options = this.relatedTableOptions[column.foreignKey.table];
      const match = options.find(option => option.value === row[column.name]);
      return match ? match.label : row[column.name];
    },
    
    formatTimestamp(timestamp) {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return date.toLocaleString();
    },
    
    formatJson(data) {
      if (!data) return '';
      try {
        if (typeof data === 'string') {
          data = JSON.parse(data);
        }
        return JSON.stringify(data, null, 2);
      } catch {
        return String(data);
      }
    },
    
    formatFileSize(bytes) {
      if (!bytes) return '0 Bytes';
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
    },
    
    truncateText(text) {
      if (text === null || text === undefined) return '';
      const str = String(text);
      return str.length > 100 ? str.substring(0, 100) + '...' : str;
    },
    
    getInputType(columnType) {
      switch (columnType) {
        case 'integer':
        case 'bigint':
        case 'smallint':
          return 'number';
        case 'date':
          return 'date';
        case 'timestamp with time zone':
        case 'timestamp without time zone':
          return 'datetime-local';
        default:
          return 'text';
      }
    },
    
    isImageAttachment(mimeType) {
      return mimeType && mimeType.startsWith('image/');
    },
    
    isPdfAttachment(mimeType) {
      return mimeType === 'application/pdf';
    },
    
    // UI interaction methods
    
    handleFileUpload(event) {
      this.uploadFile = event.target.files[0];
    },
    
    debouncedSearch() {
      // Debounce search to avoid too frequent requests
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => {
        this.currentPage = 1; // Reset to first page on new search
        this.fetchTableData();
      }, 300);
    },
    
    toggleSortOrder() {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
      this.fetchTableData();
    },
    
    prevPage() {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.fetchTableData();
      }
    },
    
    nextPage() {
      if (this.currentPage < this.pagination.totalPages) {
        this.currentPage++;
        this.fetchTableData();
      }
    }
  }
};
</script>

<template>
  <div class="admin-crud-container">
    <h2>Database Administration</h2>
    
    <div class="table-selection">
      <label for="table-select">Select Table:</label>
      <select id="table-select" v-model="selectedTable" @change="onTableChange">
        <option v-for="table in tables" :key="table" :value="table">{{ table }}</option>
      </select>
    </div>

    <div v-if="selectedTable" class="crud-controls">
      <div class="search-filter">
        <input 
          type="text" 
          v-model="searchQuery" 
          placeholder="Search..." 
          @input="debouncedSearch"
          class="search-input"
        />
        
        <div class="sort-section">
          <label for="sort-select">Sort by:</label>
          <select id="sort-select" v-model="sortBy" @change="fetchTableData">
            <option v-for="column in tableSchema" :key="column.name" :value="column.name">
              {{ column.name }}
            </option>
          </select>
          
          <button 
            @click="toggleSortOrder" 
            class="sort-order-btn"
            :title="sortOrder === 'asc' ? 'Ascending' : 'Descending'"
          >
            {{ sortOrder === 'asc' ? '↑' : '↓' }}
          </button>
        </div>
        
        <div class="page-controls">
          <button 
            :disabled="currentPage === 1" 
            @click="prevPage"
            class="pagination-btn"
          >
            &laquo; Prev
          </button>
          <span class="page-info">
            Page {{ currentPage }} of {{ pagination.totalPages || 1 }}
          </span>
          <button 
            :disabled="currentPage === pagination.totalPages || pagination.totalPages === 0" 
            @click="nextPage"
            class="pagination-btn"
          >
            Next &raquo;
          </button>
        </div>
      </div>

      <div class="action-buttons">
        <button @click="initCreateRecord" class="action-btn create">
          Add New Record
        </button>
      </div>

      <!-- Table Display -->
      <div v-if="loading" class="loading">
        Loading...
      </div>
      <div v-else-if="error" class="error-box">
        {{ error }}
      </div>
      <div v-else-if="tableData.length === 0" class="no-data">
        No records found.
      </div>
      <div v-else class="table-container">
        <table>
          <thead>
            <tr>
              <th v-for="column in tableSchema" :key="column.name">
                {{ column.name }}
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in tableData" :key="row.id">
              <td v-for="column in tableSchema" :key="column.name">
                <div v-if="isTimestampField(column.name, column.type)">
                  {{ formatTimestamp(row[column.name]) }}
                </div>
                <div v-else-if="isJsonField(column.type)">
                  <pre>{{ formatJson(row[column.name]) }}</pre>
                </div>
                <div v-else-if="isBooleanField(column.type)">
                  <span :class="row[column.name] ? 'boolean-true' : 'boolean-false'">
                    {{ row[column.name] ? 'Yes' : 'No' }}
                  </span>
                </div>
                <div v-else-if="isForeignKey(column) && hasFkRelationshipData(column, row)">
                  {{ getFkDisplay(column, row) }}
                </div>
                <div v-else>
                  {{ truncateText(row[column.name]) }}
                </div>
              </td>
              <td class="actions">
                <button @click="editRecord(row)" class="btn-icon edit" title="Edit">
                  <i class="icon">✏️</i>
                </button>
                <button @click="confirmDelete(row)" class="btn-icon delete" title="Delete">
                  <i class="icon">🗑️</i>
                </button>
                <button 
                  v-if="isAttachmentsTable && row.filename" 
                  @click="viewAttachment(row)" 
                  class="btn-icon view" 
                  title="View"
                >
                  <i class="icon">👁️</i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create Modal -->
    <div v-if="showCreateModal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Create New Record</h3>
          <button @click="showCreateModal = false" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="createRecord">
            <div v-for="column in editableColumns" :key="column.name" class="form-group">
              <label :for="`create-${column.name}`">{{ column.name }}</label>
              
              <!-- Foreign key select -->
              <select 
                v-if="isForeignKey(column) && relatedTableOptions[column.foreignKey.table]"
                v-model="newRecord[column.name]" 
                :id="`create-${column.name}`"
              >
                <option value="">-- Select --</option>
                <option 
                  v-for="option in relatedTableOptions[column.foreignKey.table]" 
                  :key="option.value" 
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
              
              <!-- Boolean field -->
              <select 
                v-else-if="isBooleanField(column.type)" 
                v-model="newRecord[column.name]"
                :id="`create-${column.name}`"
              >
                <option :value="true">Yes</option>
                <option :value="false">No</option>
              </select>
              
              <!-- Text area for long text -->
              <textarea
                v-else-if="isLongTextField(column.type)"
                v-model="newRecord[column.name]"
                :id="`create-${column.name}`"
                rows="5"
              ></textarea>
              
              <!-- Regular input fields -->
              <input
                v-else
                v-model="newRecord[column.name]"
                :id="`create-${column.name}`"
                :type="getInputType(column.type)"
                :placeholder="`Enter ${column.name}`"
              />
            </div>
            
            <!-- File upload for attachments table -->
            <div v-if="isAttachmentsTable" class="form-group">
              <label for="file-upload">File</label>
              <input 
                type="file" 
                id="file-upload" 
                @change="handleFileUpload"
              />
            </div>
            
            <div class="form-actions">
              <button type="submit" class="save-btn">Save</button>
              <button type="button" @click="showCreateModal = false" class="cancel-btn">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Edit Modal -->
    <div v-if="showEditModal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Edit Record</h3>
          <button @click="showEditModal = false" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="updateRecord">
            <div v-for="column in editableColumns" :key="column.name" class="form-group">
              <label :for="`edit-${column.name}`">{{ column.name }}</label>
              
              <!-- Foreign key select -->
              <select 
                v-if="isForeignKey(column) && relatedTableOptions[column.foreignKey.table]"
                v-model="editedRecord[column.name]" 
                :id="`edit-${column.name}`"
              >
                <option value="">-- Select --</option>
                <option 
                  v-for="option in relatedTableOptions[column.foreignKey.table]" 
                  :key="option.value" 
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
              
              <!-- Boolean field -->
              <select 
                v-else-if="isBooleanField(column.type)" 
                v-model="editedRecord[column.name]"
                :id="`edit-${column.name}`"
              >
                <option :value="true">Yes</option>
                <option :value="false">No</option>
              </select>
              
              <!-- Text area for long text -->
              <textarea
                v-else-if="isLongTextField(column.type)"
                v-model="editedRecord[column.name]"
                :id="`edit-${column.name}`"
                rows="5"
              ></textarea>
              
              <!-- Regular input fields -->
              <input
                v-else
                v-model="editedRecord[column.name]"
                :id="`edit-${column.name}`"
                :type="getInputType(column.type)"
                :placeholder="`Enter ${column.name}`"
              />
            </div>
            
            <div class="form-actions">
              <button type="submit" class="save-btn">Update</button>
              <button type="button" @click="showEditModal = false" class="cancel-btn">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="modal">
      <div class="modal-content confirm-modal">
        <div class="modal-header">
          <h3>Confirm Deletion</h3>
          <button @click="showDeleteModal = false" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <p>Are you sure you want to delete this record?</p>
          <p class="warning">This action cannot be undone.</p>
          <div class="form-actions">
            <button @click="deleteRecord" class="delete-btn">Delete</button>
            <button @click="showDeleteModal = false" class="cancel-btn">Cancel</button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Attachment Preview Modal -->
    <div v-if="showAttachmentModal" class="modal">
      <div class="modal-content attachment-modal">
        <div class="modal-header">
          <h3>{{ currentAttachment?.original_filename || currentAttachment?.filename }}</h3>
          <button @click="showAttachmentModal = false" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div v-if="currentAttachment" class="attachment-preview">
            <div v-if="isImageAttachment(currentAttachment.mime_type)">
              <img :src="`/uploads/${currentAttachment.filename}`" alt="Attachment preview" />
            </div>
            <div v-else-if="isPdfAttachment(currentAttachment.mime_type)" class="pdf-view">
              <iframe :src="`/uploads/${currentAttachment.filename}`" width="100%" height="500px"></iframe>
            </div>
            <div v-else class="download-prompt">
              <p>This file type cannot be previewed directly.</p>
              <a :href="`/uploads/${currentAttachment.filename}`" target="_blank" download>
                Download File
              </a>
            </div>
            <div class="attachment-info">
              <p><strong>File name:</strong> {{ currentAttachment.original_filename || currentAttachment.filename }}</p>
              <p><strong>File size:</strong> {{ formatFileSize(currentAttachment.file_size) }}</p>
              <p><strong>MIME type:</strong> {{ currentAttachment.mime_type }}</p>
              <p><strong>Uploaded:</strong> {{ formatTimestamp(currentAttachment.created_at) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-crud-container {
  padding: 20px;
}

h2 {
  margin-bottom: 25px;
  font-size: 28px;
  color: #333;
  border-bottom: 2px solid #eaeaea;
  padding-bottom: 10px;
}

.table-selection {
  margin-bottom: 20px;
}

.table-selection select {
  padding: 10px 15px;
  font-size: 16px;
  border-radius: 4px;
  border: 1px solid #ddd;
  background-color: #fff;
  margin-left: 10px;
  min-width: 200px;
}

.crud-controls {
  margin-bottom: 20px;
}

.search-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  align-items: center;
  margin-bottom: 15px;
}

.search-input {
  flex: 1;
  padding: 10px 15px;
  font-size: 16px;
  border-radius: 4px;
  border: 1px solid #ddd;
  min-width: 200px;
}

.sort-section {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sort-section select {
  padding: 10px;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.sort-order-btn {
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 10px 15px;
  cursor: pointer;
  font-size: 16px;
}

.page-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pagination-btn {
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 10px 15px;
  cursor: pointer;
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  font-size: 14px;
}

.action-buttons {
  margin: 20px 0;
}

.action-btn {
  padding: 10px 15px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  border: none;
}

.action-btn.create {
  background-color: #4CAF50;
  color: white;
}

.table-container {
  overflow-x: auto;
  margin-top: 20px;
  background: white;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

th {
  background-color: #f8f9fa;
  padding: 12px 15px;
  text-align: left;
  border-bottom: 2px solid #ddd;
  position: sticky;
  top: 0;
}

td {
  padding: 10px 15px;
  border-bottom: 1px solid #eee;
}

tr:hover td {
  background-color: #f5f9ff;
}

.actions {
  white-space: nowrap;
  text-align: center;
}

.btn-icon {
  margin: 0 5px;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 18px;
}

.btn-icon.edit:hover {
  color: #2196F3;
}

.btn-icon.delete:hover {
  color: #F44336;
}

.btn-icon.view:hover {
  color: #673AB7;
}

.icon {
  font-style: normal;
}

.loading {
  text-align: center;
  padding: 20px;
  font-style: italic;
  color: #666;
}

.error-box {
  background-color: #FFEBEE;
  color: #D32F2F;
  padding: 15px;
  border-radius: 4px;
  margin: 20px 0;
}

.no-data {
  text-align: center;
  padding: 20px;
  color: #666;
  font-style: italic;
}

/* Modal styles */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  width: 90%;
  max-width: 700px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 15px;
  margin-bottom: 15px;
  border-bottom: 1px solid #eee;
}

.close-btn {
  background: transparent;
  border: none;
  font-size: 24px;
  cursor: pointer;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.form-group textarea {
  resize: vertical;
  min-height: 100px;
}

.form-actions {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.save-btn {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
}

.cancel-btn {
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
}

.delete-btn {
  background-color: #F44336;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
}

.confirm-modal .modal-content {
  max-width: 400px;
}

.confirm-modal .warning {
  color: #F44336;
  font-weight: bold;
  margin-top: 10px;
}

/* Attachment modal */
.attachment-modal .modal-content {
  max-width: 800px;
}

.attachment-preview {
  margin-top: 15px;
}

.attachment-preview img {
  max-width: 100%;
  margin-bottom: 15px;
}

.attachment-info {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid #eee;
}

.pdf-view {
  width: 100%;
  margin-bottom: 15px;
}

.download-prompt {
  text-align: center;
  padding: 30px;
  border: 1px dashed #ddd;
  margin: 20px 0;
}

.download-prompt a {
  display: inline-block;
  background-color: #2196F3;
  color: white;
  padding: 10px 15px;
  border-radius: 4px;
  text-decoration: none;
  margin-top: 10px;
}

.boolean-true {
  color: #4CAF50;
  font-weight: bold;
}

.boolean-false {
  color: #F44336;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .search-filter {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-input,
  .sort-section,
  .page-controls {
    width: 100%;
  }
  
  .table-container {
    overflow-x: scroll;
  }
  
  .modal-content {
    width: 95%;
    max-height: 90vh;
  }
}
</style>
