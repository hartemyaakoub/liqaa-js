<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

/**
 * Server-side SDK token exchange for LIQAA.
 *
 * Route:
 *   Route::post('/api/liqaa/sdk-token', [LiqaaTokenController::class, 'issue'])
 *        ->middleware('auth');
 *
 * Frontend then fetches /api/liqaa/sdk-token, gets back { sdk_token, expires_at },
 * and passes it to the LIQAA SDK as data-token (or LIQAA.init).
 */
class LiqaaTokenController extends Controller
{
    public function issue(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['error' => 'unauthenticated'], 401);
        }

        $pk = config('services.liqaa.public_key');
        $sk = config('services.liqaa.secret_key');

        $identity = base64_encode(json_encode([
            'email' => $user->email,
            'name'  => $user->name,
            'ts'    => time(),
        ], JSON_UNESCAPED_UNICODE));

        $signature = hash_hmac('sha256', $identity, $sk);

        $response = Http::withToken($sk)
            ->acceptJson()
            ->asJson()
            ->timeout(8)
            ->post('https://liqaa.io/api/public/v1/sdk-token', [
                'public_key'      => $pk,
                'identity_base64' => $identity,
                'signature'       => $signature,
            ]);

        if (! $response->ok()) {
            report(new \RuntimeException('LIQAA sdk-token exchange failed: '.$response->status()));

            return response()->json(['error' => 'sdk_token_exchange_failed'], 502);
        }

        return response()->json($response->json()); // { sdk_token, expires_at }
    }
}
