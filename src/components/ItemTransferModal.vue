<template>
    <v-container class="modal elevation-24" v-if="inventoryModalOpened">
        <v-layout row>
            <!-- Non-player inventory items -->
            <v-flex xs5 col>
                <h3>Bob the NPC</h3>
                <inventory></inventory>
            </v-flex>
            <!-- Middle functionality (?) -->
            <v-flex xs2 col></v-flex>
            <!-- Player Inventory -->
            <v-flex xs5 col>
                <h3>Your Items</h3>

                <inventory></inventory>
            </v-flex>
        </v-layout>
    </v-container>
</template>

<script>
    /* import other components here */
    import inventory from './Inventory.vue'
    export default {
        components: {
            'inventory': inventory
        },
        data() {
            return {
                inventoryModalOpened: false,
            };
        },
        methods: {},
    }

</script>
<style>

</style>
