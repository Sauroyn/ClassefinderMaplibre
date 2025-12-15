/**
 * Centralized state management for RoutePlanner component
 * Uses useReducer to manage complex interconnected state
 */

import { useReducer } from 'react'
import type { Reducer } from 'react'
import type { Graph } from '../components/route-planner/utils'

// ============================================================================
// Types
// ============================================================================

export type RoutePlannerState = {
    // Graph data
    graph: Graph | null
    workingGraph: Graph | null // with provisional nodes

    // Input fields
    input: {
        start: string
        end: string
        startQuery: string
        endQuery: string
        focusedField: 'start' | 'end' | null
    }

    // Route options & results
    routes: {
        list: Array<any>
        highlighted: string | null
        selected: any | null
    }

    // Settings
    settings: {
        excludeStairs: boolean
        coveredOnly: boolean
        showSecondary: boolean
        showSettings: boolean
    }

    // UI state (mobile)
    ui: {
        isMobile: boolean
        mobileRoutesOpen: boolean
        detailsOpen: boolean
    }

    // Navigation
    navigation: {
        active: boolean
        confirmOpen: boolean
        confirmDistance: number
        confirmUserCoord: [number, number] | null
    }

    // Suggestions & Menus
    suggestions: {
        nodeOptions: Array<{ id: string; name: string; level?: string; searchKey?: string }>
        groupMenuField: 'start' | 'end' | null
        groupMenuTitle: string
        groupMenuItems: Array<{ id: string; name: string; level?: string }>
    }

    // Provisional nodes (features without graph nodes)
    provisionalNodes: Map<string, any>

    // Toast messages
    toastMessage: string | null
}

export type RoutePlannerAction =
    | { type: 'SET_GRAPH'; payload: Graph | null }
    | { type: 'SET_WORKING_GRAPH'; payload: Graph | null }
    | { type: 'SET_START'; payload: string }
    | { type: 'SET_END'; payload: string }
    | { type: 'SET_START_QUERY'; payload: string }
    | { type: 'SET_END_QUERY'; payload: string }
    | { type: 'SET_FOCUSED_FIELD'; payload: 'start' | 'end' | null }
    | { type: 'SET_ROUTES'; payload: Array<any> }
    | { type: 'SET_HIGHLIGHTED_ROUTE'; payload: string | null }
    | { type: 'SET_SELECTED_ROUTE'; payload: any | null }
    | { type: 'TOGGLE_EXCLUDE_STAIRS' }
    | { type: 'TOGGLE_COVERED_ONLY' }
    | { type: 'TOGGLE_SHOW_SECONDARY' }
    | { type: 'TOGGLE_SHOW_SETTINGS' }
    | { type: 'SET_SHOW_SETTINGS'; payload: boolean }
    | { type: 'SET_MOBILE_ROUTES_OPEN'; payload: boolean }
    | { type: 'SET_DETAILS_OPEN'; payload: boolean }
    | { type: 'SET_NAVIGATION_ACTIVE'; payload: boolean }
    | { type: 'SET_CONFIRM_OPEN'; payload: boolean }
    | { type: 'SET_CONFIRM_DISTANCE'; payload: number }
    | { type: 'SET_CONFIRM_USER_COORD'; payload: [number, number] | null }
    | { type: 'SET_NODE_OPTIONS'; payload: Array<{ id: string; name: string; level?: string }> }
    | { type: 'SET_GROUP_MENU'; payload: { field: 'start' | 'end' | null; title: string; items: Array<{ id: string; name: string; level?: string }> } }
    | { type: 'CLEAR_GROUP_MENU' }
    | { type: 'SET_PROVISIONAL_NODES'; payload: Map<string, any> }
    | { type: 'SET_TOAST_MESSAGE'; payload: string | null }
    | { type: 'RESET_ROUTES' }
    | { type: 'CLEAR_INPUTS' }

// ============================================================================
// Initial State
// ============================================================================

export function createInitialState(isMobile: boolean): RoutePlannerState {
    return {
        graph: null,
        workingGraph: null,
        input: {
            start: '',
            end: '',
            startQuery: '',
            endQuery: '',
            focusedField: null,
        },
        routes: {
            list: [],
            highlighted: null,
            selected: null,
        },
        settings: {
            excludeStairs: false,
            coveredOnly: false,
            showSecondary: true,
            showSettings: false,
        },
        ui: {
            isMobile,
            mobileRoutesOpen: false,
            detailsOpen: false,
        },
        navigation: {
            active: false,
            confirmOpen: false,
            confirmDistance: 0,
            confirmUserCoord: null,
        },
        suggestions: {
            nodeOptions: [],
            groupMenuField: null,
            groupMenuTitle: '',
            groupMenuItems: [],
        },
        provisionalNodes: new Map(),
        toastMessage: null,
    }
}

// ============================================================================
// Reducer
// ============================================================================

const routePlannerReducer: Reducer<RoutePlannerState, RoutePlannerAction> = (
    state,
    action
): RoutePlannerState => {
    switch (action.type) {
        case 'SET_GRAPH':
            return { ...state, graph: action.payload }

        case 'SET_WORKING_GRAPH':
            return { ...state, workingGraph: action.payload }

        case 'SET_START':
            return { ...state, input: { ...state.input, start: action.payload } }

        case 'SET_END':
            return { ...state, input: { ...state.input, end: action.payload } }

        case 'SET_START_QUERY':
            return { ...state, input: { ...state.input, startQuery: action.payload } }

        case 'SET_END_QUERY':
            return { ...state, input: { ...state.input, endQuery: action.payload } }

        case 'SET_FOCUSED_FIELD':
            return { ...state, input: { ...state.input, focusedField: action.payload } }

        case 'SET_ROUTES':
            return { ...state, routes: { ...state.routes, list: action.payload } }

        case 'SET_HIGHLIGHTED_ROUTE':
            return { ...state, routes: { ...state.routes, highlighted: action.payload } }

        case 'SET_SELECTED_ROUTE':
            return { ...state, routes: { ...state.routes, selected: action.payload } }

        case 'TOGGLE_EXCLUDE_STAIRS':
            return { ...state, settings: { ...state.settings, excludeStairs: !state.settings.excludeStairs } }

        case 'TOGGLE_COVERED_ONLY':
            return { ...state, settings: { ...state.settings, coveredOnly: !state.settings.coveredOnly } }

        case 'TOGGLE_SHOW_SECONDARY':
            return { ...state, settings: { ...state.settings, showSecondary: !state.settings.showSecondary } }

        case 'TOGGLE_SHOW_SETTINGS':
            return { ...state, settings: { ...state.settings, showSettings: !state.settings.showSettings } }

        case 'SET_SHOW_SETTINGS':
            return { ...state, settings: { ...state.settings, showSettings: action.payload } }

        case 'SET_MOBILE_ROUTES_OPEN':
            return { ...state, ui: { ...state.ui, mobileRoutesOpen: action.payload } }

        case 'SET_DETAILS_OPEN':
            return { ...state, ui: { ...state.ui, detailsOpen: action.payload } }

        case 'SET_NAVIGATION_ACTIVE':
            return { ...state, navigation: { ...state.navigation, active: action.payload } }

        case 'SET_CONFIRM_OPEN':
            return { ...state, navigation: { ...state.navigation, confirmOpen: action.payload } }

        case 'SET_CONFIRM_DISTANCE':
            return { ...state, navigation: { ...state.navigation, confirmDistance: action.payload } }

        case 'SET_CONFIRM_USER_COORD':
            return { ...state, navigation: { ...state.navigation, confirmUserCoord: action.payload } }

        case 'SET_NODE_OPTIONS':
            return { ...state, suggestions: { ...state.suggestions, nodeOptions: action.payload } }

        case 'SET_GROUP_MENU':
            return {
                ...state,
                suggestions: {
                    ...state.suggestions,
                    groupMenuField: action.payload.field,
                    groupMenuTitle: action.payload.title,
                    groupMenuItems: action.payload.items,
                },
            }

        case 'CLEAR_GROUP_MENU':
            return {
                ...state,
                suggestions: {
                    ...state.suggestions,
                    groupMenuField: null,
                    groupMenuTitle: '',
                    groupMenuItems: [],
                },
            }

        case 'SET_PROVISIONAL_NODES':
            return { ...state, provisionalNodes: action.payload }

        case 'SET_TOAST_MESSAGE':
            return { ...state, toastMessage: action.payload }

        case 'RESET_ROUTES':
            return {
                ...state,
                routes: { list: [], highlighted: null, selected: null },
                ui: { ...state.ui, mobileRoutesOpen: false, detailsOpen: false },
                navigation: { active: false, confirmOpen: false, confirmDistance: 0, confirmUserCoord: null },
            }

        case 'CLEAR_INPUTS':
            return {
                ...state,
                input: { start: '', end: '', startQuery: '', endQuery: '', focusedField: null },
                routes: { list: [], highlighted: null, selected: null },
            }

        default:
            return state
    }
}

// ============================================================================
// Hook
// ============================================================================

export function useRoutePlannerState(isMobile: boolean) {
    return useReducer(routePlannerReducer, createInitialState(isMobile))
}
