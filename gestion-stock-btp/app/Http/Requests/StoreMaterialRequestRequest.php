<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use App\Models\Campus;

/**
 * StoreMaterialRequestRequest
 *
 * Validates creation of new material requests with header + lines.
 * Champs : campus, service/département, objet, motif, lignes (matériel + quantité).
 */
class StoreMaterialRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        if (!$this->user()->can('material_request.create')) {
            return false;
        }

        $campusId = $this->input('campus_id');
        if (!$campusId) {
            return true;
        }

        $campus = Campus::find($campusId);
        if (!$campus) {
            return true;
        }

        $user = $this->user();
        if ($user->hasAnyRole(['director', 'point_focal'])) {
            return true;
        }
        if ($user->isSiteScoped()) {
            return (int) $user->campus_id === (int) $campus->id;
        }

        return true;
    }

    public function rules(): array
    {
        $rules = [
            'campus_id' => [
                'required',
                'integer',
                'exists:campuses,id',
                function ($attribute, $value, $fail) {
                    $campus = Campus::find($value);
                    if ($campus && !$campus->is_active) {
                        $fail('Ce campus n\'accepte pas de nouvelles demandes.');
                    }
                },
            ],
            'department_id' => [
                'nullable',
                'integer',
                'exists:departments,id',
                function ($attribute, $value, $fail) {
                    if (!$value) return;
                    $campusId = $this->input('campus_id');
                    $dept = \App\Models\Department::find($value);
                    if ($dept && $dept->campus_id != $campusId) {
                        $fail('Le service choisi n\'appartient pas au campus sélectionné.');
                    }
                },
            ],
            'request_type' => 'nullable|in:grouped,individual',
            'subject' => 'required|string|max:255',
            'justification' => 'required|string|max:5000',
            'needed_by_date' => [
                'required',
                'date',
                'after_or_equal:today',
                function ($attribute, $value, $fail) {
                    if ($value && \Carbon\Carbon::parse($value)->diffInMonths(now(), false) < -6) {
                        $fail('La date ne peut pas dépasser 6 mois.');
                    }
                },
            ],
            'notes' => 'nullable|string|max:1000',
            'lines' => 'required|array|min:1',
            'lines.*.designation' => 'required_without:lines.*.item_id|nullable|string|max:500',
            'lines.*.item_id' => 'required_without:lines.*.designation|nullable|integer|exists:items,id',
            'lines.*.quantity' => 'required|integer|min:1|max:9999',
        ];

        return $rules;
    }

    public function messages(): array
    {
        return [
            'campus_id.required' => 'Le campus est obligatoire.',
            'subject.required' => 'L\'objet de la demande est obligatoire.',
            'justification.required' => 'Le motif ou la justification est obligatoire.',
            'lines.required' => 'Ajoutez au moins un matériel à la demande.',
            'lines.min' => 'Ajoutez au moins un matériel à la demande.',
            'lines.*.quantity.required' => 'La quantité est obligatoire.',
            'lines.*.quantity.min' => 'La quantité doit être au moins 1.',
        ];
    }
}
