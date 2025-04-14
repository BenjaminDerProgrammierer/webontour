<!-- 
 TODO:
 - Create
 - Read - done
 - Update
 - Delete

 Additional features:
 - Search
 - Filter
 - Sort
 - Pagination
 - Timestamp parsing
 - CRUD operations for the attachments (files in server/attachments)
 - handle relationships between tables
 - vue-compliance (not creating elements directly in the DOM, but using Vue's reactivity system)
-->

<script setup>
import { onMounted, ref } from 'vue';

const BASE_URL = '/api/admin'

const tables = ref([]);
const activeTable = ref('');

onMounted(async () => {
    // Fetch the list of tables from the server and populate the tables array
    try {
        const response = await fetch(`${BASE_URL}/tables`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const resultTables = await response.json();
        tables.value = resultTables;
    } catch (error) {
        console.error('Error fetching tables:', error);
    }

    // Select the first table by default
    if (tables.value.length > 0) {
        activeTable.value = tables.value[0];
        selectTable(activeTable.value);
    }
});

// Function to handle table selection
async function selectTable(table) {
    activeTable.value = table;
    const tableSelectors = document.querySelectorAll('.table-selector');
    tableSelectors.forEach(selector => {
        selector.classList.remove('active');
    });
    const selectedTable = document.querySelector(`.table-selector[data-table="${table}"]`);
    if (selectedTable) {
        selectedTable.classList.add('active');
    }

    const tableUrl = `${BASE_URL}/table/${table}`;
    try {
        const response = await fetch(tableUrl);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const tableData = await response.json();
        displayTableData(tableData);
    } catch (error) {
        console.error('Error fetching table data:', error);
    }
}

// Function to display table data in the UI
function displayTableData(tableData) {
    // need to vue-ify this
    const tableContainer = document.getElementById('table-data');
    tableContainer.innerHTML = ''; // Clear previous data
    const tableElement = document.createElement('table');
    const headerRow = document.createElement('tr');

    const actionsHeader = document.createElement('th');
    actionsHeader.textContent = 'Actions';
    headerRow.appendChild(actionsHeader);

    // Create table headers
    Object.keys(tableData[0]).forEach(key => {
        key = key
          .replace(/_/g, ' ') // Replace underscores with spaces
          .toLowerCase() // Convert to lowercase
          .replace(/id/g, 'ID'); // Capitalize ID
        key = key.charAt(0).toUpperCase() + key.slice(1); // Capitalize first letter
        const th = document.createElement('th');
        th.textContent = key;
        headerRow.appendChild(th);
    });
    tableElement.appendChild(headerRow);

    // Create table rows
    tableData.forEach(row => {
        const tr = document.createElement('tr');

        // Create actions cell with edit button
        const actionsCell = document.createElement('td');
        actionsCell.className = 'actions-cell';

        const editButton = document.createElement('button');
        editButton.textContent = 'Edit';
        editButton.className = 'edit-button';
        editButton.onclick = () => {
            console.log('Edit button clicked for row:', row);
            // TODO: Implement edit functionality
        };
        actionsCell.appendChild(editButton);

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.className = 'delete-button';
        deleteButton.onclick = () => {
            console.log('Delete button clicked for row:', row);
            // TODO: Implement delete functionality
        }
        actionsCell.appendChild(deleteButton);

        tr.appendChild(actionsCell);

        Object.values(row).forEach(value => {
            const td = document.createElement('td');
            value = value === null ? 'NULL' : value; // Handle null values
            value = value.length > 50 ? value.substring(0, 50) + '...' : value;
            td.textContent = value;
            tr.appendChild(td);
        });
        tableElement.appendChild(tr);
    });

    tableContainer.appendChild(tableElement);
}

function createRow() {
    console.log('Create new row button clicked for table:', activeTable.value);
    // TODO: Implement create functionality
}

</script>

<template>
    <h3>Classic CRUD</h3>
    <div id="classic-crud">
        <ul id="tables">
            <li v-for="table in tables" :key="table">
                <button class="table-selector" :class="{ active: activeTable === table }" :data-table="table"
                    @click="selectTable(table)">
                    {{ table }}
                </button>
            </li>
        </ul>
        <div id="table-actions">
            <button class="create-button" @click="createRow">Create New Row</button>
        </div>
        <div id="table-data">
            <!-- Table data will be displayed here -->
        </div>
    </div>
</template>

<style>
#classic-crud h3 {
    text-align: center;
    margin-bottom: 20px;
}

#classic-crud {
    background-color: #f9f9f9;
    padding: 20px;
    border-radius: 8px;
}

#tables {
    list-style-type: none;
    padding: 10px;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
    width: 100%;
    justify-content: center;
    border-bottom: 1px solid #ccc;
}

.table-selector {
    background-color: #007bff;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 5px;
    cursor: pointer;
    transition: background-color 0.3s ease;

    &:hover {
        background-color: #0066d2;
    }

    &.active {
        background-color: #00b30f;
    }
}

#table-actions {
    display: flex;
    justify-content: end;
    margin-top: 20px;

    .create-button {
        background-color: #28a745;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 5px;
        cursor: pointer;
        transition: background-color 0.3s ease;

        &:hover {
            background-color: #218838;
        }
    }
}

#table-data {
    margin-top: 20px;
    padding: 0;
    background-color: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    overflow-x: auto;
    max-height: 400px;
    overflow-y: auto;

    table {
        width: 100%;
        border-collapse: collapse;
    }

    th,
    td {
        padding: 10px;
        text-align: left;
        border-bottom: 1px solid #ddd;
        white-space: nowrap;
    }

    th {
        background-color: #c5c5c5;
    }

    .actions-cell {
        display: flex;
        gap: 10px;

        .delete-button {
            background-color: #dc3545;
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 5px;
            cursor: pointer;
            transition: background-color 0.3s ease;

            &:hover {
                background-color: #c82333;
            }
        }

        .edit-button {
            background-color: #007bff;
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 5px;
            cursor: pointer;
            transition: background-color 0.3s ease;

            &:hover {
                background-color: #0069d9;
            }
        }
    }
}
</style>
